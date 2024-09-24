# Makefile

install:
	cd backend && python3 -m venv venv && . venv/bin/activate && pip install -r requirements.txt
	cd frontend && npm install

run:
	cd backend && . venv/bin/activate && python app.py &
	cd frontend && npm start
