const axios = require("axios");
const Rx = require('rxjs');
const Promise = require("bluebird");
const util = require('util');

/**
 * Returns the oauth URL to be called from the browser to trigger the oauth process.
 *
 * @param {Object} [options]
 * @param {String} [options.redirectUri] OAuth redirect URI
 * @param {String} [options.clientId] OAuth client ID
 * @param {String} params additional parameters, such as loginHint, state, etc.
 * @returns {String} The OAuth URL
 */
module.exports.oauth = function (params, options) {
	const scope = 'read_customers,read_orders';
	return 'https://' + params.shop
		+'.myshopify.com/admin/oauth/authorize'
		+ '?client_id='+options.clientId+'&scope=' + scope
		+ '&redirect_uri=' + options.redirectUri;
};

/**
 * Send the authorization code and retrieve a refresh token.
 *
 * @param {String} [params]
 * @param {String} [params.code] Authorization code
 * @param {String} [params.hmac] Shopify signature
 * @param {String} [params.shop] The shop domain
 * @param {Object} [options]
 * @param {String} [options.redirectUri] OAuth redirect URI
 * @param {String} [options.clientId] OAuth client ID
 * @param {String} [options.clientSecret] OAuth client secret
 * @returns {String} The OAuth URL
 */
module.exports.authorize = function (params, options) {
	// TODO Verify hmac, state & shop (see https://help.shopify.com/api/getting-started/authentication/oauth#get-the-client-credentials)
	return new Promise(function (resolve, reject) {
		const shop = params.shop;
		const code = params.code;
		axios.post('https://' + shop + '/admin/oauth/access_token', {
			client_id: options.clientId,
			client_secret: options.clientSecret,
			code: code
		}).then(res => {
			const accessToken = res.data.access_token;
			resolve({
				refreshToken: accessToken,
				accessToken: accessToken,
				expiresOn: null,
				metadata: {
					shop: params.shop
				},
			});
		}).catch(err => {
			reject(normalizeError(err));
		});
	});
};

module.exports.refresh = function (oauthToken) {
	return new Promise(function (resolve, reject) {
		// In shopify, (offline) access tokens are permanent, so no need to refresh it, simply return the so called refresh
		// token as an access token...
		// TODO: optimize this on the Java side, so that if the fiest access token retrieved neever expires, we don't further call refresh
		resolve(oauthToken);
	});
};

module.exports.account = function (oauthToken) {
	return new Promise(function (resolve, reject) {
		axios.defaults.baseURL = "https://" + oauthToken.metadata.shop + "/admin";
		axios.defaults.headers = {
			"X-Shopify-Access-Token": oauthToken.accessToken
		};
		getShop().subscribe(res => {
			resolve({
				loginName: res.shop.name,
				accountUrl: 'https://' + res.shop.domain
			});
		}, error => {
			reject(normalizeError(error));
		});
	});
};

module.exports.fetch = function (oauthToken, email) {
	return new Promise(function (resolve, reject) {
		// store.myshopify.com/admin/customers/search.json?query=email:name@domain.com&fields=email,id
		axios.defaults.baseURL = "https://" + oauthToken.metadata.shop + "/admin";
		axios.defaults.headers = {
			"X-Shopify-Access-Token": oauthToken.accessToken
		};
		searchCustomer(email).subscribe(res => {
			const customers = res.customers;
			if (customers && customers.length > 0) {
				const customer = customers[0];
				resolve({
					icon: 'https://storage.googleapis.com/senders-images/cards/shopify.png',
					text: displayCustomer(customer)
				});
			} else {
				resolve({
					icon: 'https://storage.googleapis.com/senders-images/cards/shopify.png',
					text: 'No customer data for this Sender.'
				});
			}
		}, error => {
			reject(normalizeError(error));
		});
	});

};

function displayCustomer(customer) {
	var res = '';
	res += '_Orders:_ ' + customer.orders_count;
	res += ' - _Total Spent:_ $' + customer.total_spent;
	if (customer.last_order_name) {
		res += ' - _Last order:_ ' + customer.last_order_name;
	}
	return res;
}

/**
 * @param internalError
 * @return Error
 */
function normalizeError(internalError) {
	var error = new Error();
	if (typeof internalError === 'string') {
		error.message = internalError;
	} else { // if (internalError instanceof Error)
		if (internalError.message) {
			error.message = internalError.message;
		} else {
			error.message = 'No Error message';
		}
		if (internalError.response) {
			var response = internalError.response;
			if (response.status) {
				error.status = response.status;
			}
			if (response.statusText) {
				error.statusText = response.statusText;
			}
			if (response.data) {
				var data = response.data;
				if (data.Code && data.Message) {
					error.cause = {
						error: data.Code,
						error_description: data.Message
					}
				} else if (data.error && data.error_description) {
					error.cause = {
						error: data.error,
						error_description: data.error_description
					};
				} else {
					error.cause = {
						error: 'unknown',
						error_description: util.inspect(data)
					}
				}
			}
		}
	}
	return error;
}

function getShop() {
	return Rx.Observable.fromPromise(axios.get('/shop.json')).map(res => res.data);
}

function searchCustomer(email) {
	return Rx.Observable.fromPromise(axios.get('/customers/search.json?query=email:' + email)).map(res => res.data);
}

/**
 * Get Order by ID.
 * See https://help.shopify.com/api/reference/order
 *
 * @param id
 * @returns {Observable<R>}
 */
function getOrder(id) {
	return Rx.Observable.fromPromise(axios.get('/orders.json?ids=' + id)).map(res => res.data);
}

