The project is made of three distinct parts : 

- The blockchain contract (`blockchain` folder)
- The back-end in python (`back` folder)
- The front-end in React (`front` folder)

To run the project : 

- In the `back` folder :
  1. Create a virtual environment : `python -m venv venv`
  2. Activate the environment : `source venv/bin/activate`
  3. Install the dependencies : `pip install -r requirements.txt`
  4. Create a `.env` file at the root of the back folder containing your personal informations
  5. Run the server : `fastapi dev`

  The swagger will be available at [localhost:8000](http://localhost:8000)

  The .env must look like : 
  ```
    OWNER_ADDRESS="YOUR PUBLIC ADDRESS" 
    OWNER_PRIVATE_KEY="YOUR PRIVATE KEY"
    RPC_URL="THE CHAIN RPC URL (https://ethereum-sepolia-rpc.publicnode.com/)"
  ```

- In the `front` folder: 
  1. Install the dependencies : `npm install`
  2. Run the application : `npm run dev`

  The application will be available at [localhost:5174](http://localhost:5174) 
