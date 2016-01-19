'use strict'

let gravatar = require('gravatar')

let getAddUserFunction = (orderBy) => {
	return (user, categories) => {
		let date = new Date(orderBy === 'joindate' ? user.registered : user.lastLogin)
		let now = new Date()
		let seconds = Math.floor((now - date) / 1000)
		let days = seconds / 60 / 60 / 24
		let categoryName = 'Ojii-san'

		if(days <= 1)
			categoryName = 'Last 24 hours'
		else if(days <= 2)
			categoryName = 'Yesterday'
		else if(days <= 7)
			categoryName = 'This week'
		else if(days <= 30)
			categoryName = 'This month'

		if(categories.hasOwnProperty(categoryName))
			categories[categoryName].push(user)
		else
			categories[categoryName] = [user]

		return true
	}
}

let orderByMethods = {
	countries: {
		getCategories: () => {
			return {}
		},

		addUser: (user, categories) => {
			if(!user.location)
				return false

			let country = user.location.countryName

			if(!country || country === '-')
				return false

			if(categories.hasOwnProperty(country))
				categories[country].push(user)
			else
				categories[country] = [user]

			return true
		}
	},

	listproviders: {
		getCategories: () => {
			return {
				'AniList': [],
				'MyAnimeList': [],
				'HummingBird': [],
				'AnimePlanet': []
			}
		},

		addUser: (user, categories) => {
			if(categories.hasOwnProperty(user.providers.list))
				categories[user.providers.list].push(user)
			else
				categories[user.providers.list] = [user]

			return true
		}
	},

	login: {
		getCategories: () => {
			return {
				'Last 24 hours': [],
				'Yesterday': [],
				'This week': [],
				'This month': [],
				'Ojii-san': []
			}
		},

		addUser: getAddUserFunction('login')
	},

	joindate: {
		getCategories: () => {
			return {
				'Last 24 hours': [],
				'Yesterday': [],
				'This week': [],
				'This month': [],
				'Ojii-san': []
			}
		},

		addUser: getAddUserFunction('joindate')
	},

	default: {
		getCategories: () => {
			return {
				All: []
			}
		},

		addUser: (user, categories) => categories.All.push(user)
	}
}

arn.repeatedly(5 * 60, () => {
	Object.keys(orderByMethods).forEach(orderBy => {
		let method = orderByMethods[orderBy]
		let categories = method.getCategories()
		let addUser = method.addUser
		let cacheKey = `users:${orderBy}`

		arn.filter('Users', user => arn.isActiveUser(user) && addUser(user, categories)).then(users => {
			users.forEach(user => {
				user.gravatarURL = gravatar.url(user.email, {s: '50', r: 'x', d: '404'}, true)
			})

			// Sort by registration date
			Object.keys(categories).forEach(categoryName => {
				let category = categories[categoryName]
				category.sort((a, b) => new Date(a.registered) - new Date(b.registered))
			})

			arn.set('Cache', cacheKey, {
				categories
			})
		})
	})
})

exports.get = function(request, response) {
	let orderBy = request.params[0] || 'default'
	let cacheKey = `users:${orderBy}`

	arn.get('Cache', cacheKey).then(record => {
		// We need to copy the object to keep the order.
		// It sucks but the database doesn't keep object properties' order.
		let categories = orderByMethods[orderBy].getCategories()

		Object.keys(record.categories).forEach(categoryName => {
			categories[categoryName] = record.categories[categoryName]
		})

		response.render({
			categories
		})
	}).catch(error => {
		response.render({})
	})
}