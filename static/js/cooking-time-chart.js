function createCookingTimeChart() {
    // Set up dimensions
    const margin = { top: 40, right: 20, bottom: 30, left: 40 };
    const container = d3.select("#cooking-time-chart");
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = container.node().getBoundingClientRect().height - margin.top - margin.bottom;

    // Create SVG
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add title
    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .text("Daily Cooking Time");

    // Create tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "cooking-tooltip")
        .style("opacity", 0);

    // Load data
    d3.json('/dashboard/api/cooking-times').then(data => {
        const days = Object.keys(data);
        const times = Object.values(data);

        // Create scales
        const x = d3.scaleBand()
            .domain(days)
            .range([0, width])
            .padding(0.1);

        const y = d3.scaleLinear()
            .domain([0, d3.max(times) * 1.2])
            .range([height, 0]);

        // Add axes
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("class", "axis-label");

        svg.append("g")
            .call(d3.axisLeft(y))
            .selectAll("text")
            .attr("class", "axis-label");

        // Create bars
        const bars = svg.selectAll(".bar")
            .data(days)
            .join("rect")
            .attr("class", "bar")
            .attr("x", d => x(d))
            .attr("width", x.bandwidth())
            .attr("y", d => y(data[d]))
            .attr("height", d => height - y(data[d]));

        // Add interactions
        bars.on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("fill", "#264653");

            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`
                <strong>${d}</strong><br/>
                Cooking Time: ${data[d]} minutes
            `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("fill", "#2a9d8f");

            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

        // Random highlight animation
        function randomHighlight() {
            const randomDay = days[Math.floor(Math.random() * days.length)];
            bars.classed("highlight", false);
            bars.filter(d => d === randomDay)
                .classed("highlight", true);
        }

        // Start random highlighting
        setInterval(randomHighlight, 3000);
    });
}

// Initialize chart when document is ready
document.addEventListener("DOMContentLoaded", createCookingTimeChart); 