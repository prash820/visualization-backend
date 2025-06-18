const mongoose = require('mongoose');

const sneakerSchema = new mongoose.Schema({
  name: String,
  price: Number,
  size: Number,
  color: String,
  stock: Number,
  image: String
});

module.exports = mongoose.model('Sneaker', sneakerSchema);