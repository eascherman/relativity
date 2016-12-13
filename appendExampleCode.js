
var example = document.getElementById('example');

var scriptDisplay = re.bundle
    `<hr />
    <pre>${example.childNodes[0].textContent}</pre>`;

re.install(scriptDisplay, document.body)