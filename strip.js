const dateFormat = require('dateformat');
const format = "dS, yyyy";

module.exports = function(customer, lastOrder) {
	var res = '';
	if (customer) {
		if (customer.created_at) {
			res += 'Added ' + dateFormat(new Date(customer.created_at)) + '. ';
		}
		res += customer.orders_count + ' orders ';
		res += ' ($' + customer.total_spent + ')';
		if (customer.last_order_name && lastOrder) {
			res += '\n_Last order:_ ' + customer.last_order_name;
			res += ' ($' + lastOrder.total_price + ')';
			if (lastOrder.cancelled_at) {
				res += ' - cancelled on ' + dateFormat(new Date(lastOrder.cancelled_at), format);
			} else if (lastOrder.closed_at) {
				res += ' - closed on ' + dateFormat(new Date(lastOrder.closed_at), format);
			} else if (lastOrder.processed_at) {
				res += ' - imported on ' + dateFormat(new Date(lastOrder.processed_at), format);
			} else if (lastOrder.updated_at) {
				res += ' - last updated on ' + dateFormat(new Date(lastOrder.updated_at), format);
			} else if (lastOrder.created_at) {
				res += ' - created on ' + dateFormat(new Date(lastOrder.created_at), format);
			}
			if (lastOrder.financial_status) {
				res += ' - ' + lastOrder.financial_status;
			}
			if (lastOrder.fulfillment_status) {
				res += ' - ' + lastOrder.fulfillment_status;
			} else {
				res += ' - not fulfilled';
			}
		}
	} else {
		res = 'No customer data.';
	}
	return {
		icon: 'https://storage.googleapis.com/senders-images/cards/shopify.png',
		text: res
	};
};
