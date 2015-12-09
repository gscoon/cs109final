#CS109 Final Project

## Making Requests

#### Making Individual Requests
http://107.170.13.109:2222/keywords?url=" + [URL to scrape]
* simple GET request
* make sure provided URL is valid (ie. http://....)
* http://107.170.13.109:2222/keywords?url=http://www.wsj.com/articles/sheldon-silver-conviction-shakes-albany-1448936770

#### Making Bulk Requests (Post URL data)
http://107.170.13.109:2222/keywords-batch
* You must make a POST request with an array of URLs using the key "url"
* {url:["http://google.com","http://yahoo.com"]}

## Handling Responses

#### Receiving Individual Response
Data is returned as a json object

- status:
    * returns true if data is scraped
    * (true or false)


- keywords
	* an object of objects.  Sub-objects have keys with a given keyword and values have the corresponding to how important that keyword was in the html
	* {"word1":30, "word2": 20}


- ranked
	* a list of tuples, ranked by the most relevant key word
	* [["word1",30], ["word2", 20]]



#### Receiving Bulk Response
A JSON object is returned with two keys (results and mapping)

- results
	* contains an array matching the url array passed.  Each instance of the array has a value that matches the individual response above.
- mapping
	* contains a dictionary with URLs as keys and the corresponding array index as the value
	* {"http://google.com":0, "http://yahoo.com":1}


## Server Stuff

### starting script
forever start -p /var/projects/final-gs/web-server -a -l logs/log.txt -o logs/output.txt -e logs/error.txt app.js


### Setting up the server


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
    npm install forever -g
