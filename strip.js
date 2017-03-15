const moment = require('moment');

module.exports = function (customer, lastOrder) {
	var res = '';
	if (customer) {
		if (customer.created_at) {
			res += 'Customer added ' + moment(customer.created_at).fromNow() + '. ';
		}
		res += customer.orders_count + ' orders';
		res += ' (' + currency(customer.total_spent) + ')';
		if (customer.last_order_name && lastOrder) {
			res += '\nLast order';
			if (lastOrder.cancelled_at) {
				res += ' cancelled ' + moment(lastOrder.cancelled_at).fromNow();
			} else if (lastOrder.closed_at) {
				res += ' closed ' + moment(lastOrder.closed_at).fromNow();
			} else if (lastOrder.processed_at) {
				res += ' ' + moment(lastOrder.processed_at).fromNow();
			// } else if (lastOrder.updated_at) {
			// 	res += ' ' + moment(lastOrder.updated_at).fromNow();
			} else if (lastOrder.created_at) {
				res += ' ' + moment(lastOrder.created_at).fromNow();
			}
			res += ' _' + customer.last_order_name + '_';
			res += ' (' + currency(lastOrder.total_price) + ')';
			var items = lastOrder.line_items;
			if (items && items.length > 0) {
				res += ' ' + items.map(item => item.name).join(', ');
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

function currency(n) {
	var num = Number.parseFloat(n);
	if (num - Math.floor(num) == 0) {
		return "$" + Math.floor(num);
	}
	return "$" + n;
}