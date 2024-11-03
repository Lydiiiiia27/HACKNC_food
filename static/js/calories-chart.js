const caloriesUrl = '/dashboard/api/calories';

d3.json(caloriesUrl).then(data => {
    createCaloriesChart(data);
});

function createCaloriesChart(data) {
    // Set the dimensions and margins of the graph
    const margin = {top: 40, right: 20, bottom: 60, left: 60};
    const container = d3.select("#calories-chart");
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = container.node().getBoundingClientRect().height - margin.top - margin.bottom;

    // Clear any existing SVG
    container.select("svg").remove();

    // Create SVG
    const svg = container
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Fetch data
    fetch('/dashboard/api/calories')
        .then(response => response.json())
        .then(data => {
            // Convert data to array format and ensure positive values
            const caloriesData = Object.entries(data).map(([day, calories]) => ({
                day: day,
                calories: Math.max(0, calories) // Ensure positive values
            }));

            // X axis
            const x = d3.scaleBand()
                .range([0, width])
                .domain(caloriesData.map(d => d.day))
                .padding(0.2);

            // Add X axis
            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x))
                .selectAll("text")
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", ".15em")
                .attr("transform", "rotate(-45)");

            // Y axis
            const y = d3.scaleLinear()
                .domain([0, d3.max(caloriesData, d => d.calories) * 1.1])
                .range([height, 0]);

            // Add Y axis
            svg.append("g")
                .call(d3.axisLeft(y));

            // Add Y axis label
            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 0 - margin.left)
                .attr("x", 0 - (height / 2))
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .text("Calories");

            // Create bars
            svg.selectAll(".bar")
                .data(caloriesData)
                .join("rect")
                .attr("class", "bar")
                .attr("x", d => x(d.day))
                .attr("width", x.bandwidth())
                .attr("y", d => {
                    const yValue = y(d.calories);
                    // Return the top of the chart if the value is invalid
                    return isNaN(yValue) || yValue < 0 ? height : yValue;
                })
                .attr("height", d => {
                    const barHeight = height - y(d.calories);
                    // Ensure the height is never negative
                    return isNaN(barHeight) || barHeight < 0 ? 0 : barHeight;
                })
                .attr("fill", "#69b3a2")
                .on("mouseover", function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("fill", "#4a7c74");
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("fill", "#69b3a2");
                });

            // Add title
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", 0 - margin.top / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("font-weight", "bold")
                .text("Daily Calories");
        })
        .catch(error => {
            console.error('Error loading calories data:', error);
            container
                .append("p")
                .attr("class", "error-message")
                .text("Error loading calories data");
        });
}

// Initial creation
document.addEventListener("DOMContentLoaded", createCaloriesChart);

// Redraw on window resize with debounce
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(createCaloriesChart, 250);
});
