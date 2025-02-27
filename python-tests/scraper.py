import requests
from bs4 import BeautifulSoup
import json

# URL of the website to scrape
url = "https://diagrams.mingrammer.com/docs/nodes/aws"

# Send a GET request to the website
response = requests.get(url)

# Check if the request was successful
if response.status_code != 200:
    print(f"Failed to retrieve the page. Status code: {response.status_code}")
    exit()

# Parse the HTML content using BeautifulSoup
soup = BeautifulSoup(response.content, "html.parser")

# Initialize the dictionary to store the data
data = {"diagrams.aws": {}}

# Find all the sections (headings) and corresponding AWS services
for section in soup.find_all("h2"):
    section_name = section.text.strip().lower().replace(" ", "_")
    data["diagrams.aws"][section_name] = []

    # Find the next sibling <ul> element containing the list of services
    ul = section.find_next_sibling("ul")
    if ul:
        for li in ul.find_all("li"):
            # Extract the service name (text inside the <code> tag)
            code_tag = li.find("code")
            if code_tag:
                service_name = code_tag.text.strip()
                data["diagrams.aws"][section_name].append(service_name)

# Convert the dictionary to JSON
json_data = json.dumps(data, indent=4)

# Save the JSON to a file
with open("aws_services.json", "w") as f:
    f.write(json_data)

print("JSON data saved to aws_services.json")