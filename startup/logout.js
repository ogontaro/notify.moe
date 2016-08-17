// Logout
app.get('/logout', function(req, res) {
	if(req.session && req.session.destroy) {
		req.session.destroy(function(err) {
			if(err)
				console.error('Session destroy error:', error)
			
			Promise.delay(1000).then(() => {
				this.writeHead(302, {
					'Location': '/'
				})
				this.end()
			})
		})
	} else {
		req.logout()
		res.redirect('/')
	}
})