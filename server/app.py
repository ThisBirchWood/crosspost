from flask import Flask
from db.database import Database

app = Flask(__name__)
db = Database(db_name='ethnograph', user='user', password='password')

@app.route('/')
def index():
    return "Welcome to the Ethnograph View Server!"

if __name__ == "__main__":
    app.run(debug=True)