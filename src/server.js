import { MongoClient } from 'mongodb';
import bodyParser from 'body-parser';
import express from 'express';
import path from 'path';

const app = express();

app.use(express.static(path.join(__dirname, '/build')));
app.use(bodyParser.json());

//whenever we define an endpoint that needs to use the database we don't have to do all the setup and tear down code. We can just wrap whatever operations we want to make inside our new WithDB function.
const WithDB = async (Operations, res) => {
	try {
		const client = await MongoClient.connect("mongodb://localhost:27017", {
			useNewURLParser: true,
		});
		const db = client.db("project");
		
		await Operations(db);
		
		client.close();
	} catch (error) {
		res.status(500).json({ message: "Error to connect to db", error });
	}
}

app.get('/api/articles/:name', async (req, res) => {
	WithDB(async (db) => {
		const ArticleName = req.params.name;

		const ArticleInfo = await db
			.collection("articles")
			.findOne({ name: ArticleName });
		res.status(200).json(ArticleInfo);
	}, res);
})

//upvote articles
//async -- await
//callback function (req,res) => ...
app.post('/api/articles/:name/upvote', async (req, res) => {
	WithDB(async (db) => {
		const ArticleName = req.params.name;

		const ArticleInfo = await db
			.collection("articles")
			.findOne({ name: ArticleName });

		//increment the number of upvotes for our article in the db
		await db.collection("articles").updateOne(
			{ name: ArticleName },
			{
				$set: {
					upvotes: ArticleInfo.upvotes + 1,
				},
			}
		);

		const UpdatedArticleInfo = await db
			.collection("articles")
			.findOne({ name: ArticleName });

		res.status(200).json(UpdatedArticleInfo);
	}, res);
}); 

app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname + '/build/index.html'));
});

//Add a comment
app.post('/api/articles/:name/add-comment', (req, res) => {
	const { username, text } = req.body;
	const ArticleName = req.params.name;

	WithDB(async (db) => {
		const ArticleInfo = await db.collection('articles').findOne({ name: ArticleName });
		await db.collection('articles').update({ name: ArticleName }, {
			'$set': {
				comments: ArticleInfo.comments.concat({ username, text }),
			},
		});
		const UpdatedArticleInfo = await db.collection('articles').findOne({ name: ArticleName });

		res.status(200).json(UpdatedArticleInfo);
	}, res);
});

/* app.get('/hello', (req, res) => res.send('Hello!'));
app.get('/hello/:name', (req, res) => res.send(`Hello ${req.params.name}!`));
app.post('/hello', (req, res) => res.send(`Hello ${req.body.name}!`)); */

app.listen(8000, () => console.log('Listening on port 8000'));
