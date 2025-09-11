document.addEventListener("DOMContentLoaded", function () {
    const wishTable = document.getElementById("wishTable").getElementsByTagName("tbody")[0];
    const addWishButton = document.getElementById("addWish");

    function loadWishes() {
        fetch("/wishpool.json")
            .then(response => response.json())
            .then(data => {
                wishTable.innerHTML = ""; // 清空表格
                data.forEach(wish => addWishToTable(wish.name, wish.music_topic, wish.topic_details || ""));
            });
    }

    addWishButton.addEventListener("click", function () {
        const name = document.getElementById("name").value.trim();
        const topic = document.getElementById("musicTopic").value.trim();
        const details = document.getElementById("topicDetails").value.trim();

        if (name && topic) {
            let newWish = { name, music_topic: topic, topic_details: details };

            // 发送到后端
            fetch("/save-wish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newWish)
            })
            .then(response => response.json())
            .then(() => {
                addWishToTable(name, topic, details);
                clearForm();
            });
        }
    });

    function addWishToTable(name, topic, details) {
        const row = wishTable.insertRow();
        row.insertCell(0).textContent = name;
        row.insertCell(1).textContent = topic;
        row.insertCell(2).textContent = details;
    }

    function clearForm() {
        document.getElementById("name").value = "";
        document.getElementById("musicTopic").value = "";
        document.getElementById("topicDetails").value = "";
    }

    loadWishes();
});
