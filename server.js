const fs = require("fs");
const express = require("express");
const app = express();

app.use(express.json());

// 读取 wishpool.json
app.get("/wishpool.json", (req, res) => {
    fs.readFile("data/wishpool.json", "utf8", (err, data) => {
        if (err) return res.status(500).send("Error reading file");
        res.json(JSON.parse(data));
    });
});

// 添加新愿望
app.post("/save-wish", (req, res) => {
    fs.readFile("data/wishpool.json", "utf8", (err, data) => {
        if (err) return res.status(500).send("Error reading file");

        let wishes = JSON.parse(data);
        wishes.push(req.body);

        fs.writeFile("data/wishpool.json", JSON.stringify(wishes, null, 2), (err) => {
            if (err) return res.status(500).send("Error saving file");
            res.json({ message: "Wish added!" });
        });
    });
});

app.listen(3000, () => console.log("Server running on port 3000"));
