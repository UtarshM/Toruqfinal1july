<?php
include( "ka_include/common_function.php" );
include( "ka_include/session.php" );
include( "ka_include/ka_config.php" );

if ( isset( $_SESSION[ 'adm_id' ] ) ) {
  header( 'Location: dashboard.php' );
}

if ( isset( $_POST[ 'signin' ] ) ) {
  $adm_contact = $_POST[ 'adm_contact' ];
  $adm_password = md5($_POST['adm_password']); 
  $field = "*";

  $result_admin = "SELECT * FROM admin_login where adm_contact='" . $adm_contact . "' and  adm_password='".$adm_password."' and  adm_status='1'";
  $result_adm = $con->query( $result_admin );
  $row_admin = $result_adm->fetch_object();
  $result_admin_tot = "SELECT * FROM admin_login where  adm_contact='" . $adm_contact . "' and  adm_password='".$adm_password."' and adm_status='1'";
  $result_admin_tot = $con->query( $result_admin_tot );
  $total_records = $result_admin_tot->num_rows;
  if($total_records>=1)
		{	
      $_SESSION[ 'adm_contact' ] = $row_admin->adm_contact;
      $_SESSION[ 'adm_username' ] = $row_admin->adm_username;
      $_SESSION[ 'adm_id' ] = $row_admin->adm_id;
      $_SESSION[ 'adm_type' ] = $row_admin->adm_type;
      $_SESSION[ 'adm_cat_id' ] = $row_admin->adm_cat_id;
      $_SESSION[ 'adm_branch' ] = $row_admin->branch_id;
      // $_SESSION[ 'adm_branch' ] = 2;
      if($_SESSION[ 'adm_cat_id' ]==2) {
        header( 'Location: rto_dashboard.php' );
      } else {
        header( 'Location: insurance_dashboard.php' );
      }
		}
		else
		{				
			$flag = 111;
		}
  // if ( $total_records >= 1 ) {

  //     // Updated
	// 		$adm_verification = mt_rand(100000,999999);
 	// 		$adm_updated =date('Y-m-d H:i:s');
			
	// 		// SMS Sending code
	// 		// $ms_otp="Sharing it with anyone allows unauthorized access to your Scigate account. Your OTP is ".$adm_verification.". Do not share with anyone";
	// 		// $msg_otp=str_replace(' ','%20',$ms_otp);
	// 		// $ch = curl_init();
	// 		// curl_setopt($ch, CURLOPT_URL, "".$sms_api_url."&Mobile=".$adm_contact."&MsgText=".$msg_otp."&Resp=None&TemplateID=1307161762818375059");
	// 		// curl_setopt($ch, CURLOPT_HEADER, 0);
	// 		// curl_exec($ch);
	// 		// curl_close($ch);
	// 		// SMS Sending code
			
			
	// 		$sql_adm_updt = "UPDATE admin_login SET adm_verification='".$adm_verification."', adm_updated='".$adm_updated."' WHERE adm_contact=".$adm_contact;
	// 		if ($con->query($sql_adm_updt) === TRUE) {
  //       header( 'Location: verification.php?adm_contact='.$adm_contact );
  //     }
  //   // $_SESSION[ 'adm_contact' ] = $row_admin->adm_contact;
  //   // $_SESSION[ 'adm_username' ] = $row_admin->adm_username;
  //   // $_SESSION[ 'adm_id' ] = $row_admin->adm_id;
  // } else {
  //   $flag = 111;
  // }
} 
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Sign In - <?php echo $meta_title; ?> </title>
<link href="css/style.default.css" rel="stylesheet">
<!-- HTML5 shim and Respond.js IE8 support of HTML5 elements and media queries --> 
<!--[if lt IE 9]>
  <script src="js/html5shiv.js"></script>
  <script src="js/respond.min.js"></script>
  <![endif]-->
</head>
<body class="signin">
<section>
  <div class="signinpanel">
    <div class="row">
      <div class="col-md-3"> &nbsp; </div>
      <!-- col-sm-7 -->
      <div class="col-md-6">
        <div>
          <center>
            <img src="img/logo.jpg" width="200px"><br><br>
          </center>
        </div>
        <form action="" class="" name="frmindex" method="post">
          <h4 class="nomargin" style="color:#1C1B17">Sign In</h4>
          <?php
          if ( isset( $flag ) ) {
            echo '<p class="mt5 mb20" style="color:red;"> This phone number does not exist in our records. </p>';
          } else {
            echo '<p class="mt5 mb20"> Sign in to access your account. </p>';
          }
          ?>
          <lable class="form-lable"> Mobile No.</lable>
          <input style="margin-top: 0px;" type="text" name="adm_contact" placeholder="ex: 9898656532" pattern="\d*" minlength="10" maxlength="10"  required class="form-control" /><br>
          <lable class="form-lable"> Password</lable>
          <input style="margin-top: 0px;" type="password" name="adm_password" id="adm_password" class="form-control pword" required placeholder="Password *" />
           
          <input type="submit" name="signin" value="Sign In" class="btn btn-success btn-block">
        </form>
      </div>
      <!-- col-sm-5 -->
      <div class="col-md-3"> &nbsp; </div>
      <!-- col-sm-7 --> 
    </div>
    <!-- row -->
    <div class="signup-footer">
      <center>
        &copy; <?php echo date('Y'); ?> <a href="http://kasanamedia.com/" target="_blank">Developed  By Kasana Media</a>
      </center>
    </div>
  </div>
  <!-- signin --> 
</section>
<script src="js/jquery-1.11.1.min.js"></script> 
<script src="js/jquery-migrate-1.2.1.min.js"></script> 
<script src="js/bootstrap.min.js"></script> 
<script src="js/modernizr.min.js"></script> 
<script src="js/jquery.sparkline.min.js"></script> 
<script src="js/jquery.cookies.js"></script> 
<script src="js/toggles.min.js"></script> 
<script src="js/retina.min.js"></script> 
<script src="js/custom.js"></script> 
<script>
    jQuery(document).ready(function(){
        
        // Please do not use the code below
        // This is for demo purposes only
        var c = jQuery.cookie('change-skin');
        if (c && c == 'greyjoy') {
            jQuery('.btn-success').addClass('btn-orange').removeClass('btn-success');
        } else if(c && c == 'dodgerblue') {
            jQuery('.btn-success').addClass('btn-primary').removeClass('btn-success');
        } else if (c && c == 'katniss') {
            jQuery('.btn-success').addClass('btn-primary').removeClass('btn-success');
        }
    });
</script>
</body>
</html>
