<?php
include( "ka_include/session.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
$adm_id = $_SESSION[ "adm_id" ];
if ( isset( $_POST[ 'old_password' ] ) ) {
  $old_password = md5( $_POST[ 'old_password' ] );
  $new_password = md5( $_POST[ 'adm_password' ] );
  $confirm_password = md5( $_POST[ 'confirm_password' ] );

  $query_adm_dup = "SELECT * FROM admin_login ld where  ld.adm_contact='" . $_SESSION[ 'adm_contact' ] . "' and ld.adm_password!='" . $old_password . "'";
  $result_dup = $con->query( $query_adm_dup );
  $total_records_dup = $result_dup->num_rows;
  if ( $total_records_dup >= 1 ) {
    $flag = 11;
  } else {


    $sql_adm_updt = "UPDATE admin_login SET adm_password='" . $new_password . "' WHERE adm_id=" . $adm_id;
    if ( $con->query( $sql_adm_updt ) === TRUE ) {
      header( 'Location: profile.php?flag=2' );
    } else {
      header( 'Location: profile.php' );
    }
  }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Profile - <?php echo $meta_title; ?></title>
<link href="css/style.default.css" rel="stylesheet">
<!-- HTML5 shim and Respond.js IE8 support of HTML5 elements and media queries --> 
<!--[if lt IE 9]>
  <script src="js/html5shiv.js"></script>
  <script src="js/respond.min.js"></script>
  <![endif]--> 
<script>
function validation ()
{
	var a = document.getElementById("password").value;
	var b = document.getElementById("confirmPassword").value;
	if(a!==b)
	{	
	    alert("New password and Confirm password not mached");
	    document.getElementById('password').focus();
		return false;
	}
}
</script>
</head>
<body>
<!-- Preloader -->
<div id="preloader">
  <div id="status"><i class="fa fa-spinner fa-spin"></i></div>
</div>
<section>
  <div class="leftpanel">
    <div class="logopanel">
      <h1><span>[</span> bracket <span>]</span></h1>
    </div>
    <!-- logopanel -->
    <?php include("left-column.php");?>
    <!-- leftpanelinner --> 
  </div>
  <!-- leftpanel -->
  <div class="mainpanel">
    <?php include("header.php");?>
    <div class="pageheader">
      <h2><i class="fa fa-home"></i> Profile </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li class="active">Profile</li>
        </ol>
      </div>
    </div>
    <div class="contentpanel">
      <div class="row">
        <div class="col-md-12">
          <form method="post"  name="frmadmin_changepwd" id="" class="" action="" >
            <div class="panel panel-default">
              <div class="panel-heading">
                <div class="panel-btns"> <a href="" class="panel-close">&times;</a> <a href="" class="minimize">&minus;</a> </div>
                <h4 class="panel-title">Profile</h4>
                <?php if(isset($flag)==11){?>
                <p style="color:red;">Your Old Password does not matched with our database.</p>
                <?php }else if(isset($_GET['flag']) && $_GET['flag']==2){?>
                <p style="color:green;">Password changed successfully.</p>
                <?php } ?>
                <p>Please set up your profile here.</p>
              </div>
              <div class="panel-body">
                <div class="form-group">
                  <label class="col-sm-3 control-label">Old Password <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="password" name="old_password" class="form-control" placeholder="Type old password..." required />
                  </div>
                </div>
                <div class="form-group">
                  <label class="col-sm-3 control-label">New Password <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="password" name="adm_password" id="password" class="form-control" placeholder="Type new password..." required />
                  </div>
                </div>
                <div class="form-group">
                  <label class="col-sm-3 control-label">Confirm Password</label>
                  <div class="col-sm-9">
                    <input type="password" class="form-control" name="confirmPassword" id="confirmPassword" placeholder="Type confirm password..." required />
                  </div>
                </div>
              </div>
              <!-- panel-body -->
              <div class="panel-footer">
                <div class="row">
                  <div class="col-sm-9 col-sm-offset-3">
                    <input type="submit" name="submit" value="Submit" class="btn btn-primary" onClick="return validation();">
                    <button type="reset" class="btn btn-default">Reset</button>
                  </div>
                </div>
              </div>
            </div>
            <!-- panel -->
          </form>
        </div>
        <!-- col-md-6 --> 
      </div>
      <!--row --> 
    </div>
    <!-- contentpanel --> 
  </div>
  <!-- mainpanel --> 
  <!-- rightpanel --> 
</section>
<script src="js/jquery-1.11.1.min.js"></script> 
<script src="js/jquery-migrate-1.2.1.min.js"></script> 
<script src="js/bootstrap.min.js"></script> 
<script src="js/modernizr.min.js"></script> 
<script src="js/jquery.sparkline.min.js"></script> 
<script src="js/toggles.min.js"></script> 
<script src="js/retina.min.js"></script> 
<script src="js/jquery.cookies.js"></script> 
<script src="js/select2.min.js"></script> 
<script src="js/jquery.validate.min.js"></script> 
<script src="js/custom.js"></script>
</body>
</html>
