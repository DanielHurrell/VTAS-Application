Installation
1. Install the Required Software
Download and install the following:
• Visual Studio Code: https://code.visualstudio.com/
• Node.js (LTS): https://nodejs.org/
• XAMPP: https://www.apachefriends.org/
2. Start XAMPP
1. Open the XAMPP Control Panel.
2. Start Apache.
3. Start MySQL.
3. Set Up the Database
1. Open your browser and navigate to http://localhost/phpmyadmin.
2. Create a database named vtas.
3. Select the database and import the supplied vtas.sql file.
4. Open the Project
1. Extract the supplied VTAS project folder.
2. Open Visual Studio Code.
3. Select File → Open Folder and open the VTAS project.
4. Open a terminal in Visual Studio Code.
5. Run the Application
In the VS Code terminal, execute:
node server.js
Wait for the server to start successfully.
6. Access VTAS
Open your web browser and navigate to:
http://localhost:3000 (this might not be the exact port, so just confirm by checking
the terminal for the output which will show the exact URL and port)
The VTAS application is now ready to use.
Note: The XAMPP MySQL service must remain running while using VTAS. The Node.js
server must also remain running in the VS Code terminal.
