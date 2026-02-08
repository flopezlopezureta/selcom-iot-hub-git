<?php
header('Content-Type: text/plain');
echo "Diagnostic for Selcom IoT - v1.4.0 Deployment\n";
echo "-------------------------------------------\n";
echo "Current Directory: " . getcwd() . "\n";
echo "Parent Directory Contents:\n";
print_r(scandir('..'));
echo "\nAssets Directory Contents:\n";
if (is_dir('../assets')) {
    print_r(scandir('../assets'));
} else {
    echo "Assets dir not found at ../assets\n";
}
echo "\nIndex.html first 200 chars:\n";
if (file_exists('../index.html')) {
    echo substr(file_get_contents('../index.html'), 0, 200) . "\n";
} else {
    echo "index.html not found at ../index.html\n";
}
?>