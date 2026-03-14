// TOGGLE BUTTON
(function () {
	// Get all elements with the "toggle-button" class
    const toggleButtons = document.querySelectorAll(".toggle-button");
    const closeAnimatedMenu = (element) => {
        element.classList.remove("open");
        element.classList.remove("close");
        element.classList.add("menu-collapse-closed");
        element.setAttribute("aria-hidden", "true");
    };

    const openAnimatedMenu = (element) => {
        element.classList.remove("close");
        element.classList.add("open");
        element.classList.remove("menu-collapse-closed");
        element.setAttribute("aria-hidden", "false");
    };

    // Function to hide all elements except the target
    function hideAllExcept(targetElement) {
        document.querySelectorAll(".open").forEach((element) => {
            if (element !== targetElement) {
                if (element.classList.contains("menu-collapse")) {
                    closeAnimatedMenu(element);
                } else {
                    element.classList.add("close"); // Hide the element
                    element.classList.remove("open"); // Close previously open elements
                }
            }
        });
    }

    // Function to toggle the state of an element (open/close)
    function toggleElement(targetElement) {
        if (targetElement.classList.contains("menu-collapse")) {
            const isHidden = targetElement.classList.contains("menu-collapse-closed");
            hideAllExcept(targetElement);
            if (isHidden) {
                openAnimatedMenu(targetElement);
            } else {
                closeAnimatedMenu(targetElement);
            }
            return;
        }

        const isHidden = targetElement.classList.contains("close");
        hideAllExcept(targetElement);
        targetElement.classList.toggle("close", !isHidden);
        targetElement.classList.toggle("open", isHidden);
    }

    toggleButtons.forEach((button) => {
        button.addEventListener("click", function () {
            const targetIds = this.getAttribute("data-target").split(" ");
            targetIds.forEach((targetId) => {
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    toggleElement(targetElement);
                }
            });
        });
    });

    // Add event listener to the document to close elements when a click occurs outside of open elements
    document.addEventListener("click", function (event) {
        const targetElements = Array.from(document.querySelectorAll(".open"));
        const clickedOutsideAllTargets = targetElements.every((element) => {
            return !element.contains(event.target) && !event.target.closest(".toggle-button");
        });

        if (clickedOutsideAllTargets) {
            targetElements.forEach((element) => {
                if (element.classList.contains("menu-collapse")) {
                    closeAnimatedMenu(element);
                } else {
                    element.classList.remove("open"); // Close open elements
                    element.classList.add("close"); // Hide elements
                }
            });
        }
    });

})();
