<?php
$hash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
$pass1 = 'admindemo';
$pass2 = 'password';

echo "Testing hash: $hash\n";
echo "admindemo: " . (password_verify($pass1, $hash) ? 'VALID' : 'INVALID') . "\n";
echo "password: " . (password_verify($pass2, $hash) ? 'VALID' : 'INVALID') . "\n";
?>