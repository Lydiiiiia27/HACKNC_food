// Initialize dimensions at the start of the file
const mapContainer = d3.select("#map-chart");
const mapSvg = mapContainer.select("svg");
const width = mapContainer.node().getBoundingClientRect().width;
const height = mapContainer.node().getBoundingClientRect().height;

// Update SVG attributes
mapSvg
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("viewBox", `0 0 ${width} ${height}`);

// Create a group for the map
const g = mapSvg.append("g");

// Set up projection
const projection = d3.geoMercator()
    .center([0, 20])
    .scale(width / 6.5)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

// Add zoom behavior
const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", (event) => {
        g.attr("transform", event.transform);
    });

mapSvg.call(zoom);

// Create tooltip
const tooltip = d3.select("body").append("div")
    .attr("class", "map-tooltip")
    .style("opacity", 0);

// Load and render map data
Promise.all([
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
    d3.json('/dashboard/api/countries')
]).then(([worldData, countryData]) => {
    // Create color scale
    const colorScale = d3.scaleLinear()
        .domain([0, d3.max(Object.values(countryData))])
        .range(["#e0f3e8", "#2a9d8f"]);

    // Draw map
    g.selectAll("path")
        .data(worldData.features)
        .join("path")
        .attr("d", path)
        .attr("fill", d => {
            const count = countryData[d.properties.name] || 0;
            return count > 0 ? colorScale(count) : "#f0f0f0";
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5)
        .on("mouseover", function(event, d) {
            const count = countryData[d.properties.name] || 0;
            if (count > 0) {
                d3.select(this)
                    .style("stroke", "#000")
                    .style("stroke-width", 1.5);

                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`
                    <strong>${d.properties.name}</strong><br/>
                    Dishes: ${count}
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            }
        })
        .on("mouseout", function() {
            d3.select(this)
                .style("stroke", "#fff")
                .style("stroke-width", 0.5);
            
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // Add title
    mapSvg.append("text")
        .attr("x", width/2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("class", "title")
        .text("Cuisine Distribution by Country");
}).catch(error => {
    console.error('Error loading map data:', error);
});

// Example error handling
fetch('/dashboard/api/countries')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Handle your data
        console.log('Countries data:', data);
    })
    .catch(error => {
        console.error('Error loading countries data:', error);
        // Handle the error appropriately in your UI
    });
