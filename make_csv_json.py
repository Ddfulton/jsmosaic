import json
from os import listdir
from os.path import isfile, join

mypath = "public/data"
onlyfiles = [f for f in listdir(mypath) if isfile(join(mypath, f))]
myjson = json.dumps(onlyfiles)
	
with open('public/data/compiled.json', 'w') as outfile:
	json.dump(onlyfiles, outfile)
print onlyfiles
