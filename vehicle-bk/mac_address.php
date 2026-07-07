<?php
$MAC = exec('getmac');
$MAC = strtok($MAC, ' ');
echo "MAC address of Server is: $MAC"; exit;
?>