
module.exports = function(customer, lastOrder) {
	var res = '';
	if (customer) {
		res += '_Orders:_ ' + customer.orders_count;
		res += ' ($' + customer.total_spent + ')';
		if (customer.last_order_name && lastOrder) {
			res += ' - _Last order:_ ' + customer.last_order_name;
			res += ' ($' + lastOrder.total_price + ')';
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
		res = 'No customer data for this Sender.';
	}
	return {
		icon: 'https://storage.googleapis.com/senders-images/cards/shopify.png',
		text: res
	};
};
