<?php
$password = 'admindemo';
$hashInDb = '$2y$10$38DAh7VYHmEO4RDwQLXma.exhTfY0f5eeGzWN6XDZP77OnyLItj0q';
$hashInComment = '$2y$10$6xps20ZJ944wYpUD4jqntOZZVg0GVXu4/5jzwuMgKW5azOkcBhQQm';

echo "Testing password: '$password'\n";

if (password_verify($password, $hashInDb)) {
    echo "MATCHES hash in DB (INSERT statement).\n";
} else {
    echo "DOES NOT MATCH hash in DB.\n";
}

if (password_verify($password, $hashInComment)) {
    echo "MATCHES hash in Comment.\n";
} else {
    echo "DOES NOT MATCH hash in Comment.\n";
}

echo "Generating new hash for '$password':\n";
echo password_hash($password, PASSWORD_DEFAULT) . "\n";
?>