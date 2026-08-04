

const UserModel = require('./User');
const ProductModel = require('./Product');
const AuctionModel = require('./Auction');
const OrderModel = require('./Order');
const PaymentModel = require('./Payment');
const WalletModel = require('./Wallet');
const SubscriptionModel = require('./Subscription');
const NotificationModel = require('./Notification');

module.exports = {
  User: UserModel,
  Product: ProductModel,
  Auction: AuctionModel,
  Order: OrderModel,
  Payment: PaymentModel,
  Wallet: WalletModel,
  Subscription: SubscriptionModel,
  Notification: NotificationModel,
};