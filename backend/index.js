const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const socketIo = require("socket.io");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

app.use(cors());

// parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "practice_db",
});

// connect with mysql db
db.connect((err) => {
    if (err) {
        console.error("Database connection failed: " + err);
        return;
    }
    console.log("Connected to database");
});

app.get("/", (req, res) => {
    res.send("Hello");
});

app.get("/sales-expenses", (req, res) => {
    db.query("SELECT * FROM sales_expenses", (err, results) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: "Something went wrong!" });
        } else {
            // calculate profit
            const modifiedData = results.map((item) => ({
                year: item.year,
                sales: item.sales,
                expenses: item.expenses,
                profit: item.sales - item.expenses,
            }));
            // format data in google charts format
            const formatedData = [["Year", "Sales", "Expenses", "Profit"]];
            modifiedData.forEach((item) => {
                const { year, sales, expenses, profit } = item;
                formatedData.push([year, sales, expenses, profit]);
            });

            res.json(formatedData);
        }
    });
});

const fetchUpdatedDataFromDB = () => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM sales_expenses", (err, results) => {
            if (err) {
                reject(err);
            } else {
                // Process the data as needed
                const modifiedData = results.map((item) => ({
                    year: item.year,
                    sales: item.sales,
                    expenses: item.expenses,
                    profit: item.sales - item.expenses,
                }));

                // format data in google charts format
                const formatedData = [["Year", "Sales", "Expenses", "Profit"]];
                modifiedData.forEach((item) => {
                    const { year, sales, expenses, profit } = item;
                    formatedData.push([year, sales, expenses, profit]);
                });
                resolve(formatedData);
            }
        });
    });
};

// io connection
io.on("connection", (socket) => {
    console.log("Client connected");
    const emitUpdatedData = async () => {
        try {
            const newData = await fetchUpdatedDataFromDB();
            socket.emit("update", newData);
        } catch (error) {
            console.log(error);
        }
    };

    emitUpdatedData();

    const interval = setInterval(emitUpdatedData, 5000);

    // Handle client disconnection
    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});

// listen server
server.listen(5000, () => {
    console.log(`Server is running on port 5000`);
});
