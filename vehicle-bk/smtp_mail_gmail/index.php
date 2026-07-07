<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
// Include PHPMailer library files
require 'PHPMailer/Exception.php';
require 'PHPMailer/PHPMailer.php';
require 'PHPMailer/SMTP.php';

$mail = new PHPMailer;

// // SMTP configuration
// $mail->isSMTP();
// $mail->Host = 'smtp.gmail.com';
// $mail->SMTPAuth = true;
// $mail->Username = 'user@gmail.com';
// $mail->Password = '*****';
// $mail->SMTPSecure = 'tls';
// $mail->Port = 587;

// SMTP configuration
$mail->isSMTP();
$mail->Host = 'mail.torqueautoadvisor.com';
$mail->SMTPAuth = true;
$mail->Username = 'info@torqueautoadvisor.com';
$mail->Password = 'T@rk#123$45';
$mail->SMTPSecure = 'ssl';
$mail->Port = 465;

$mail->setFrom('info@torqueautoadvisor.com', 'Torque Auto Advisor');
$mail->addReplyTo('info@torqueautoadvisor.com', 'Torque Auto Advisor');

// Add a recipient
$mail->addAddress('asif.kasanamedia@gmail.com');

// Add cc or bcc 
//$mail->addCC('cc@example.com');
//$mail->addBCC('bcc@example.com');

// Add attachments
// $mail->addAttachment('files/codexworld.pdf');

// Email subject
$mail->Subject = 'Send Email via SMTP using PHPMailer';

// Set email format to HTML
$mail->isHTML(true);

// Email body content
$mailContent = '
    <h2>Send HTML Email using SMTP in PHP</h2>
    <p>It is a test email by Torque Auto Advisor, sent via SMTP server with PHPMailer using PHP.</p>
    <p>Read the tutorial and download this script from.</p>';
$mail->Body = $mailContent;

// Send email
if(!$mail->send()){
    echo 'Message could not be sent.';
    echo 'Mailer Error: ' . $mail->ErrorInfo;
}else{
    echo 'Message has been sent.';
}