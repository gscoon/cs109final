#CS109 Final Project

## Structure URL
[IP Address of server] + ":2000/keywords/?url=" + [URL to scrape]

## How is data returned
Data is returned as a json object

- status:
    (true or false)
    returns true if data is scraped

- keywords
{"word1":30, "word2": 20}
an object of objects.  Sub-objects have keys with a given keyword and values have the corresponding to how important that keyword was in the html

- ranked
[["word1",30], ["word2", 20]]
a list of tuples, ranked by the most relevant key word




## Setting up the server


- scrapes and gets keywords

###install:
node:

		sudo apt-get --purge remove node
		sudo apt-get --purge remove nodejs-legacy
		sudo apt-get --purge remove nodejs

		sudo apt-get install nodejs-legacy

python:

		sudo apt-get install python-pip python-dev build-essential
		sudo pip install --upgrade pip
		sudo pip install --upgrade virtualenv

newspaper:

		sudo apt-get install python-dev
		sudo apt-get install libxml2-dev libxslt-dev
		sudo apt-get install libjpeg-dev zlib1g-dev libpng12-dev
		pip install newspaper
		curl https://raw.githubusercontent.com/codelucas/newspaper/master/download_corpora.py | python2.7

       pip install urllib3


       import nltk
       nltk.download('punkt')

express

	npm install express --save
	npm install express-generator -g

	npm install -g nodemon
