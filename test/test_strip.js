const strip = require('../strip.js');
const fs = require("fs");
const assert = require("assert");
const Promise = require('bluebird');
const readFile = Promise.promisify(fs.readFile);
const writeFile = Promise.promisify(fs.writeFile);
const util = require('util');

Promise.all([
	readFile('customers.json'),
	readFile('orders.json')
]).then(res => {
	const customers = JSON.parse(res[0]).customers;
	const orders = JSON.parse(res[1]).orders;
	const strip1 = strip(customers[0], orders[0]);
	assert.equal('https://storage.googleapis.com/senders-images/cards/shopify.png', strip1.icon);
	assert.equal(strip1.text, 'Customer added 2 days ago. 2 orders ($756)\nLast order 2 days ago _#1003_ ($700) IPhone 7 - paid - not fulfilled');
	const strip2 = strip(customers[0], orders[1]);
	assert.equal(strip2.text, 'Customer added 2 days ago. 2 orders ($756)\nLast order closed 2 days ago _#1003_ ($56) T-Shirt cool - paid - fulfilled');
	console.log('Test OK');
}).catch(err => {
	console.log(util.inspect(err));
});

