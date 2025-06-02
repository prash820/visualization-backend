import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderTime: { type: Date, default: Date.now },
  status: String,
  items: [{ name: String, price: Number }],
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }
});

const Order = mongoose.model('Order', orderSchema);

export default Order;