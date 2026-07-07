<?php
include( "ka_include/session.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/common_function.php" );
include( "ka_include/check_admin_login.php" );
// Check Module Rights
$query_module_detail = "SELECT * FROM admin_login ld where adm_id='" . $_SESSION[ 'adm_id' ] . "' and adm_status=1";
$module_query = $con->query( $query_module_detail );
$row_md_id = $module_query->fetch_array();
// echo $row_state['md_id']; exit;
$md_right = explode( ",", $row_md_id[ 'md_id' ] );
if ( !in_array( "1", $md_right ) ) {
  header( 'Location: #' );
}
// Check Module Rights

$settings_id = $_GET[ 'settings_id' ];
$query_state_detail = "SELECT * FROM settings_detail ld where ld.settings_id=" . $settings_id;
$result_query = $con->query( $query_state_detail );
$row_state = $result_query->fetch_object();

if ( isset( $_POST[ "submit" ] ) ) {


  $settings_description = addslashes( $_POST[ "settings_description" ] );
  $settings_status = 1;
  $updated_date = date( 'Y-m-d H:i:s' );

  $sql_settings_updt = "UPDATE settings_detail SET settings_description='" . $settings_description . "', updated_date='" . $updated_date . "' WHERE settings_id=" . $settings_id;
  if ( $con->query( $sql_settings_updt ) === TRUE ) {
    header( 'Location: settings_view.php?flag=2' );
  } else {
    header( 'Location: settings_edit.php?settings_id=' . $settings_id );
  }


}


// echo $_POST['txtEditorContent'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="images/favicon.png" type="image/png">
<title>Settings Edit - <?php echo $meta_title; ?></title>
<link href="css/style.default.css" rel="stylesheet">
<link rel="stylesheet" href="css/bootstrap-wysihtml5.css" />
<link href="css/prettyPhoto.css" rel="stylesheet">
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
      <h2><i class="fa fa-pen"></i> Settings Edit </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="#">Dashboard</a></li>
          <li class="active">Settings Edit</li>
        </ol>
      </div>
    </div>
    <div class="contentpanel">
      <div class="row">
        <div class="col-md-12">
          <form method="post"  name="frmadmin_changepwd" id="" class="" action="" enctype="multipart/form-data" >
            <div class="panel panel-default">
              <div class="panel-heading">
                <div class="panel-btns"> <a href="" class="panel-close">&times;</a> <a href="" class="minimize">&minus;</a> </div>
                <h4 class="panel-title">Settings Description</h4>
                <?php if(isset($flag)==11){?>
                <p style="color:red;">This cms is already exist. Please enter another cms name.</p>
                <?php } ?>
                <p>Please set up your Settings details here.</p>
              </div>
              <div class="panel-body">
                <div class="form-group">
                  <label class="col-sm-3 control-label">Description <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="text" name="" id="settings_name" value="<?php echo $row_state->settings_name ?>" disabled="disabled" class="form-control" placeholder="Type your Cms Name..." required />
                  </div>
                </div>
                <div class="form-group">
                  <label class="col-sm-3 control-label">Amount </label>
                  <div class="col-sm-9">
                    <!-- <textarea id="editor1X" name="settings_description" placeholder="Enter here..." class="form-control" rows="2" required><?php echo $row_state->settings_description ?></textarea> -->
                    <input type="number" name="settings_description" value="<?php echo $row_state->settings_description ?>" class="form-control" placeholder="ex : 10" required /> 
                    <!--<textarea id="txtEditorContent" name="txtEditorContent" hidden=""></textarea>--> 
                  </div>
                </div>
              </div>
              <!-- panel-body -->
              <div class="panel-footer">
                <div class="row">
                  <div class="col-sm-9 col-sm-offset-3">
                    <input type="submit" name="submit" value="Submit" class="btn btn-primary" onClick="return validation();">
                    <input type="reset" style="background:#FFFFFF" class="btn btn-default" value="Cancel" onClick="location.href='settings_view.php'">
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
<script src="js/jquery.prettyPhoto.js"></script> 
<script src="js/wysihtml5-0.3.0.min.js"></script> 
<script src="js/bootstrap-wysihtml5.js"></script> 

<script src="js/custom.js"></script> 

</body>
</html>
