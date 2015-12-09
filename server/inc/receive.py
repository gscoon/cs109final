import sys, json
from newspaper import Article

htmlStr = ""

for line in sys.stdin:
    htmlStr = htmlStr + line

#obj = json.loads(jsonStr)
article = Article('')
article.set_html(htmlStr);
article.parse()
article.nlp()
ret = json.dumps(article.keywords)
print ret
