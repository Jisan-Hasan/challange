import { useEffect, useState } from "react";
import Chart from "react-google-charts";
import io from "socket.io-client";
import "./App.css";

// const socket = io("http://localhost:5000");
const socket = io("http://localhost:5000");

function App() {
    const [data, setData] = useState(null);
    useEffect(() => {
        // Fetch initial data
        fetch("http://localhost:5000/sales-expenses")
            .then((response) => response.json())
            .then((data) => setData(data))
            .catch((error) => console.error("Error fetching data:", error));

        // Listen for real-time updates
        socket.on("update", (newData) => {
            // console.log(newData);
            setData(newData);
        });
    }, []);

    const options = {
        chart: {
            title: "Company Performance",
            subtitle: "Sales, Expenses, and Profit",
        },
    };
    return (
        <>
            <div
                style={{ width: "95%", textAlign: "center", margin: "0 auto" }}
            >
                {data && (
                    <Chart
                        chartType="Bar"
                        width="100%"
                        height="500px"
                        data={data}
                        options={options}
                    />
                )}
            </div>
        </>
    );
}

export default App;
