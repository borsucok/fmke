const { ObjectID } = require('mongodb');
const db = require('../database');

const dbContacts = () => {
  return db.collection('contacts');
};

exports.getAllContacts = async (ctx) => {
  const contacts = await dbContacts().then(async (collection) => {
    const { bdayFrom, bdayTo } = ctx.query;
    if (!bdayFrom && !bdayTo) {
      return collection.find({}).toArray();
    } else {
      return (
        await collection
          .aggregate([
            {
              $addFields: {
                isBdayFrom: {
                  $gte: [
                    { $dayOfYear: '$birthdate' },
                    { $dayOfYear: new Date(bdayFrom) },
                  ],
                },
                isBdayTo: {
                  $lte: [
                    { $dayOfYear: '$birthdate' },
                    { $dayOfYear: new Date(bdayTo) },
                  ],
                },
              },
            },
            {
              $match: {
                ...(bdayFrom ? { isBdayFrom: true } : {}),
                ...(bdayTo ? { isBdayTo: true } : {}),
              },
            },
          ])
          .toArray()
      ).map(({ isBdayFrom, isBdayTo, ...contact }) => contact);
    }
  });
  return { contacts };
};

exports.createNewContact = async (ctx) => {
  const contact = {
    ...ctx.request.body,
    birthdate: new Date(ctx.request.body.birthdate),
  };
  ctx.response.status = 201;
  return await dbContacts().then(async (collection) => {
    await collection.insertOne(contact);
    return contact;
  });
};

exports.getContact = async (ctx) => {
  const contact = await dbContacts().then((collection) => {
    return collection.findOne({ _id: new ObjectID(ctx.params.id) });
  });
  if (!contact) {
    const error = new Error('Contact not found');
    error.status = 404;
    throw error;
  }
  return contact;
};

exports.updateContact = async (ctx) => {
  const updateSet = {
    ...ctx.request.body,
    birthdate: new Date(ctx.request.body.birthdate),
  };
  const { value: updatedContact } = await dbContacts().then((collection) => {
    return collection.findOneAndUpdate(
      { _id: new ObjectID(ctx.params.id) },
      { $set: updateSet },
      { returnOriginal: false },
    );
  });
  if (!updatedContact) {
    const error = new Error('Contact not found');
    error.status = 404;
    throw error;
  }
  return updatedContact;
};

exports.deleteContact = async (ctx) => {
  const { value: deletedContact } = await dbContacts().then((collection) => {
    return collection.findOneAndDelete({ _id: new ObjectID(ctx.params.id) });
  });
  if (!deletedContact) {
    const error = new Error('Contact not found');
    error.status = 404;
    throw error;
  }
  return deletedContact;
};
