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

app.post("/sales-expenses", (req, res) => {
    const { year, sales, expenses } = req.body;

    // validate data
    if (!year || !sales || !expenses) {
        return res
            .status(400)
            .json({ error: "Year, sales, and expenses are required fields." });
    }

    // prepare query
    const insertQuery =
        "INSERT INTO sales_expenses (year, sales, expenses) VALUES (?, ?, ?)";
    const values = [year, sales, expenses];

    // execute query
    db.query(insertQuery, values, (err, results) => {
        if (err) {
            console.error(err);
            return res
                .status(500)
                .json({ error: "Something went wrong while inserting data." });
        }

        // Data successfully inserted
        return res.status(201).json({ message: "Data inserted successfully." });
    });
    console.log(req.body);
});

// update data
app.patch("/sales-expenses/:year", (req, res) => {
    const itemId = req.params.year;
    const { year, sales, expenses } = req.body;

    if (!year && !sales && !expenses) {
        return res.status(400).json({
            error: "At least one field (year, sales, or expenses) is required for the update.",
        });
    }

    // Build the partial update query based on provided fields
    let updateQuery = "UPDATE sales_expenses SET";
    const values = [];

    if (year) {
        updateQuery += " year = ?,";
        values.push(year);
    }

    if (sales) {
        updateQuery += " sales = ?,";
        values.push(sales);
    }

    if (expenses) {
        updateQuery += " expenses = ?,";
        values.push(expenses);
    }

    // Remove the trailing comma
    updateQuery = updateQuery.slice(0, -1);

    updateQuery += " WHERE year = ?";
    values.push(itemId); // Include the ID in the values array

    db.query(updateQuery, values, (err, results) => {
        if (err) {
            console.error(err);
            return res
                .status(500)
                .json({ error: "Something went wrong while updating data." });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: "Item not found." });
        }

        // Data successfully updated
        return res.status(200).json({ message: "Data updated successfully." });
    });
});

// delete data by year
app.delete("/sales-expenses/:year", (req, res) => {
    const targetYear = req.params.year;

    if (!targetYear) {
        return res.status(400).json({ error: "Year parameter is required." });
    }

    const deleteQuery = "DELETE FROM sales_expenses WHERE year = ?";
    const values = [targetYear];

    db.query(deleteQuery, values, (err, results) => {
        if (err) {
            console.error(err);
            return res
                .status(500)
                .json({ error: "Something went wrong while deleting data." });
        }

        if (results.affectedRows === 0) {
            return res
                .status(404)
                .json({ error: "No data found for the specified year." });
        }
        // Respond with a 204 No Content status
        return res.status(204).end();
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

    const interval = setInterval(emitUpdatedData, 2000);

    // Handle client disconnection
    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});

// listen server
server.listen(5000, () => {
    console.log(`Server is running on port 5000`);
});
