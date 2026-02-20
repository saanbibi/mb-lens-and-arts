// Updated click event handler for autocomplete functionality

const handleClick = (event) => {\n    const target = event.target;\n    const isExternalLink = target.matches('a[target="_blank"]');\n\n    // Check if the clicked element is an external link\n    if (isExternalLink) {\n        // Allow the external link to function properly\n        return;\n    }\n\n    // Close autocomplete if a non-external link is clicked\n    closeAutocomplete();\n};

// Assuming this is around line 550-560
\ndocument.addEventListener('click', handleClick);