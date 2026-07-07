<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
if ( $_SESSION[ 'adm_type' ] != 0 ) {
  header( 'Location: #' );
}
$adm_id = $_GET[ 'adm_id' ];
if ( isset( $_POST[ "submit" ] ) ) {
  $adm_cat_id = addslashes( $_POST[ "adm_cat_id" ] );
  $adm_username = addslashes( $_POST[ "adm_username" ] );
  $adm_contact = addslashes( $_POST[ "adm_contact" ] );
  $adm_password =  $_POST["adm_password"]; 
  $password_hide =  $_POST["password_hide"]; 
  if($adm_password!=$password_hide) {
  $adm_password =  md5($adm_password);  
  } else {
  $adm_password =  $password_hide;  
  }
  
  $checkbox1 = $_POST[ 'md_id' ];
  $adm_updated = date( "Y-m-d H:i:s" );
  $updated_by = $_SESSION[ 'adm_id' ];
  $md_id = "";
  foreach ( $checkbox1 as $md_id1 ) {
    $md_id .= $md_id1 . ",";
  }


  $adm_status = addslashes( $_POST[ "adm_status" ] );
  // Check  Duplicate Record
  $query_adm_dup = "SELECT * FROM admin_login where adm_id!='" . $adm_id . "' and adm_contact='" . $adm_contact . "' and adm_status='1'";
  $result_dup = $con->query( $query_adm_dup );
  $total_records_dup = $result_dup->num_rows;
  if ( $total_records_dup >= 1 ) {
    $flag = 11;
    $adm_username = $adm_username;
    $adm_contact = $adm_contact;
    $md_id = $md_id;

  } else {
    $sql_admin_updt = "UPDATE admin_login SET adm_cat_id='" . $adm_cat_id . "', adm_username='" . $adm_username . "', adm_contact='" . $adm_contact . "', adm_password='".$adm_password."', md_id='" . $md_id . "', updated_by='" . $updated_by . "', adm_status='" . $adm_status . "',  adm_updated='" . $adm_updated . "' WHERE adm_id=" . $adm_id;
    if ( $con->query( $sql_admin_updt ) === TRUE ) {
      header( 'Location: admin_view.php?flag=2' );
    } else {
      header( 'Location: admin_edit.php?adm_id=' . $adm_id );
    }
  }
}
$query_state_detail = "SELECT * FROM admin_login ld where ld.adm_id=" . $adm_id;
$result_query = $con->query( $query_state_detail );
$row_state = $result_query->fetch_object();

if($row_state->branch_id != $_SESSION['adm_branch']) {
  header( 'Location: #' );
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="description" content="">
<meta name="author" content="">
<link rel="shortcut icon" href="images/favicon.png" type="image/png">
<title>Sub Admin Edit -<?php echo " ".$project_title." "; ?></title>
<link href="css/style.default.css" rel="stylesheet">
<link rel="stylesheet" href="css/bootstrap-wysihtml5.css" />
<link href="css/prettyPhoto.css" rel="stylesheet">
<script>
function myPassFunc() {
    var x = document.getElementById("myPassword");
    if (x.type === "password") {
        x.type = "text";
    } else {
        x.type = "password";
    }
} 
</script>
</head>
<body>
<div id="preloader">
  <div id="status"><i class="fa fa-spinner fa-spin"></i></div>
</div>
<section>
  <div class="leftpanel">
    <div class="logopanel">
      <h1><span>[</span> bracket <span>]</span></h1>
    </div>
    <?php include("left-column.php");?>
  </div>
  <div class="mainpanel">
    <?php include("header.php");?>
    <div class="pageheader">
      <h2><i class="fa fa-pen"></i> Sub Admin Edit </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="#">Dashboard</a></li>
          <li class="active">Sub Admin Edit</li>
        </ol>
      </div>
    </div>
    <div class="contentpanel">
      <div class="row">
        <div class="col-md-12">
          <form method="post"  name="frmadmin_changepwd" enctype="multipart/form-data" id="" class="" action="" >
            <div class="panel panel-default">
              <div class="panel-heading">
                <div class="panel-btns"> <a href="" class="panel-close">&times;</a> <a href="" class="minimize">&minus;</a> </div>
                <h4 class="panel-title">Sub Admin</h4>
                <?php if(isset($flag)==11){?>
                <p style="color:red;">This no. is already exists</p>
                <?php } ?>
                <p>Please set admin details here</p>
              </div>
              <div class="panel-body">
                
                 <div class="form-group">
                  <label class="col-sm-3 control-label">Category <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <select required class="form-control" name="adm_cat_id" >
                      <option value="" > Select Category  </option>
                      <?php
                      $query_adm_cat = "SELECT * FROM admin_category_detail WHERE adm_cat_status=1";
                      $result_adm_cat = $con->query( $query_adm_cat );
                      while ( $row_adm_cat = $result_adm_cat->fetch_object() ) {
                        ?>
                      <option <?php if($row_adm_cat->adm_cat_id==$row_state->adm_cat_id) { ?>selected<?php } ?> value="<?php echo $row_adm_cat->adm_cat_id?>" > <?php echo $row_adm_cat->adm_cat_name?> </option>
                      <?php } ?>
                    </select>
                  </div>
                </div>
                <div class="form-group">
                  <label class="col-sm-3 control-label">Name   <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="text"  name="adm_username" value="<?php if($adm_username!="") { echo $adm_username; } else { echo $row_state->adm_username;} ?>" class="form-control" placeholder="" required />
                  </div>
                </div>
                <div class="form-group">
                  <label class="col-sm-3 control-label">Mobile No.  <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="phone" name="adm_contact" class="form-control" placeholder="ex: 9898986532" pattern="\d*" minlength="10" maxlength="10" value="<?php if($adm_contact!="") { echo $adm_contact; } else { echo $row_state->adm_contact;} ?>"  required />
                  </div>
                </div>
                 <div class="form-group">
                  <label class="col-sm-3 control-label">Password <span class="asterisk">*</span></label>
                  <div class="col-sm-4">
                    <input type="password" name="adm_password" minlength="6"   class="form-control" value="<?php if($_GET["fl_adm_password"]!="") { echo $_GET["fl_adm_password"]; } else { echo $row_state->adm_password; } ?>" placeholder="ex: test@123" required id="myPassword" />
                    <input type="hidden" name="password_hide"   class="form-control" value="<?php echo $row_state->adm_password;?>" />
                  </div>
                  <div class="col-sm-5">
                    <div style="margin-top:6px;">
                      <input type="checkbox" onClick="myPassFunc()">
                      &nbsp;Show Password </div>
                  </div>
                </div>
                <?php
                if ( $md_id != "" ) {
                  $checkbox2 = $md_id;
                  $sizes = $checkbox2;
                  $sizes = explode( ",", $sizes );
                } else {
                  $sizes = $row_state->md_id;
                  $sizes = explode( ",", $sizes );
                }
                ?>
                <div class="form-group">
                  <label class="col-sm-3 control-label">Module Rights </label>
                  <div class="col-sm-9">
                    <?php
                    $query_module = "SELECT * FROM module_detail where md_status='1' and md_id!=2 ORDER BY md_id";
                    $result_module = $con->query( $query_module );
                    while ( $mou = $result_module->fetch_object() ) {
                      ?>
                    <div class="col-sm-3" style="margin:10px 0px;">
                      <input type="checkbox" name="md_id[]" value="<?php  echo $mou->md_id;?>" <?php  if (in_array($mou->md_id, $sizes)) { echo "checked";} else {echo "";} ?>>
                      <?php echo $mou->md_name;?> </div>
                    <?php }  ?>
                  </div>
                </div>
                <div class="form-group">
                  <label class="col-sm-3 control-label">Status <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <select required class="form-control" name="adm_status" >
                      <?php
                      $query_status = "SELECT * FROM status_detail WHERE status_id IN (1,2)";
                      $result_status = $con->query( $query_status );
                      while ( $row_status = $result_status->fetch_object() ) {
                        ?>
                      <option <?php if($row_status->status_id==$row_state->adm_status) { ?>selected<?php } ?> value="<?php echo $row_status->status_id?>" > <?php echo $row_status->status_name?> </option>
                      <?php } ?>
                    </select>
                  </div>
                </div>
              </div>
              <div class="panel-footer">
                <div class="row">
                  <div class="col-sm-9 col-sm-offset-3">
                    <input type="submit" name="submit" value="Submit" class="btn btn-primary" onClick="return validation();">
                    <input type="reset" style="background:#FFFFFF" class="btn btn-default" value="Cancel" onClick="location.href='admin_view.php'">
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</section>
<script src="js/jquery-1.11.1.min.js"></script> 
<script src="js/jquery-migrate-1.2.1.min.js"></script> 
<script src="js/bootstrap.min.js"></script> 
<script src="js/modernizr.min.js"></script> 
<script src="js/jquery.sparkline.min.js"></script> 
<script src="js/toggles.min.js"></script> 
<script src="js/retina.min.js"></script> 
<script src="js/jquery.cookies.js"></script> 
<script src="js/jquery.prettyPhoto.js"></script> 
<script src="js/wysihtml5-0.3.0.min.js"></script> 
<script src="js/bootstrap-wysihtml5.js"></script> 
<script src="js/custom.js"></script>
</body>
</html>
