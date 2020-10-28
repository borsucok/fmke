const MongoClient = require('mongodb').MongoClient;

const state = { client: null, db: null };

const connect = async () => {
  if (!state.client) {
    state.client = await MongoClient.connect(
      'mongodb://fmke:***@localhost:27017/fmke',
      {
        useUnifiedTopology: true,
        useNewUrlParser: true,
      },
    );
    state.db = state.client.db('fmke');
  }
  return state.client;
};
exports.connect = connect;

exports.disconnect = () => {
  if (state.client) {
    state.client.disconnect();
  }
  state.client = null;
  state.db = null;
};

exports.collection = async (collectionName) => {
  await connect();
  return state.db.collection(collectionName);
};
