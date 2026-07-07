<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
// Check Module Rights
$query_module_detail = "SELECT * FROM admin_login ld where adm_id='" . $_SESSION[ 'adm_id' ] . "' and adm_status=1";
$module_query = $con->query( $query_module_detail );
$row_md_id = $module_query->fetch_array();
// echo $row_state['md_id']; exit;
$md_right = explode( ",", $row_md_id[ 'md_id' ] );
if ( !in_array( "14", $md_right ) ) {
  header( 'Location: #' );
}
// Check Module Rights

$slr_id = $_GET[ 'slr_id' ];

if ( isset( $_POST[ "submit" ] ) ) {
   
  
  $slr_date = addslashes( $_POST[ "slr_date" ] );
  $adm_id = addslashes( $_POST[ "adm_id" ] );
  $slr_fix = addslashes( $_POST[ "slr_fix" ] );
  $slr_paid = addslashes( $_POST[ "slr_paid" ] );
  $slr_ded = addslashes( $_POST[ "slr_ded" ] );
  $slr_pre = addslashes( $_POST[ "slr_pre" ] );
  $slr_abs = addslashes( $_POST[ "slr_abs" ] );
   

  $slr_status = addslashes( $_POST[ "slr_status" ] );
  $updated_date = date( 'Y-m-d H:i:s' );
  $updated_by = $_SESSION[ 'adm_id' ];

  $sql_expe_updt = "UPDATE salary_detail SET slr_date='" . $slr_date . "', adm_id='" . $adm_id . "', slr_fix='" . $slr_fix . "', slr_paid='" . $slr_paid . "', slr_ded='" . $slr_ded . "', slr_pre='" . $slr_pre . "', slr_abs='" . $slr_abs . "',  updated_by='" . $updated_by . "', slr_status='" . $slr_status . "', updated_date='" . $updated_date . "' WHERE slr_id=" . $slr_id;
  if ( $con->query( $sql_expe_updt ) === TRUE ) {
    header( 'Location: salary_view.php?flag=2' );
  } else {
    header( 'Location: salary_edit.php?slr_id=' . $slr_id . '' );
  }
}

$query_state_detail = "SELECT * FROM salary_detail ld where ld.slr_id=" . $slr_id;
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
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Salary Edit   -<?php echo $meta_title; ?></title>
<link href="css/style.default.css" rel="stylesheet">
<link rel="stylesheet" href="css/bootstrap-wysihtml5.css" />
<link href="css/prettyPhoto.css" rel="stylesheet">
<script>
  function validation() {
    var a = document.getElementById("password").value;
    var b = document.getElementById("confirmPassword").value;
    if (a !== b) {
      alert("New password and Confirm password not mached");
      document.getElementById('password').focus();
      return false;
    }
  }
  
</script> 

<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script> 

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
    <?php include("left-column.php"); ?>
    <!-- leftpanelinner --> 
  </div>
  <!-- leftpanel -->
  <div class="mainpanel">
    <?php include("header.php"); ?>
    <div class="pageheader">
      <h2><i class="fa fa-pen"></i> Salary Edit   </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="#">Dashboard</a></li>
          <li class="active">Salary Edit  </li>
        </ol>
      </div>
    </div>
    <div class="contentpanel">
      <div class="row">
        <div class="col-md-12">
          <form method="post" name="frmadmin_changepwd" enctype="multipart/form-data" id="" class="" action="">
            <div class="panel panel-default">
              <div class="panel-heading">
                <div class="panel-btns"> <a href="" class="panel-close">&times;</a> <a href="" class="minimize">&minus;</a> </div>
                <h4 class="panel-title">Salary Details</h4>
                <p>Please set salary details here</p>
                <?php if($_GET['flag']==4) {?>
                <p class="mb20" style="color:green">Type wrong</p>
                <?php } else if($_GET['flag']==5) {?>
                <p class="mb20" style="color:green">Size big</p>
                <?php } ?>
              </div>
              <div class="panel-body">
                <div class="form-group">
              <label class="col-sm-3 control-label">No.   <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="text" disabled class="form-control" placeholder="" value="<?php echo $row_state->slr_code_no; ?>"  />
              </div>
            </div>
                <div class="form-group">
                  <label class="col-sm-3 control-label">Date <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="date" name="slr_date" id="slr_date" value="<?php $datend   = new DateTime($row_state->slr_date); echo $datend->format('Y-m-d'); ?>" class="form-control" placeholder="Type dob..." required />
                  </div>
                </div>

                <div class="form-group">
              <label class="col-sm-3 control-label">Select User<span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="adm_id" >
                  <option value="" >Select Select User</option>
                   <?php
                  $query_admin = "SELECT * FROM admin_login WHERE adm_status=1 and adm_id!=1 and branch_id=".$_SESSION[ 'adm_branch' ]."";
                  $result_admin = $con->query( $query_admin );
                  while ( $row_admin = $result_admin->fetch_object() ) {
                    ?>
                  <option value="<?php echo $row_admin->adm_id?>" <?php if ($row_admin->adm_id==$row_state->adm_id) { ?>selected<?php } ?> > <?php echo $row_admin->adm_username?> </option>
                  <?php } ?>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label class="col-sm-3 control-label">Fix Salary  <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="slr_fix" id="slr_fix" value="<?php if($row_state->slr_fix!="") { echo $row_state->slr_fix; }  ?>" class="form-control" pattern="\d+(\.\d{1,2})?" min="0" required placeholder="500" />
              </div>
            </div>
            <div class="form-group">
              <label class="col-sm-3 control-label">Paid Amount <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="slr_paid" id="slr_paid" value="<?php if($row_state->slr_paid!="") { echo $row_state->slr_paid; }  ?>" class="form-control" pattern="\d+(\.\d{1,2})?" min="0" required placeholder="500" />
              </div>
            </div>
            <div class="form-group">
              <label class="col-sm-3 control-label">Deduction Amount  <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="slr_ded" id="slr_ded" value="<?php if($row_state->slr_ded!="") { echo $row_state->slr_ded; }  ?>" class="form-control" pattern="\d+(\.\d{1,2})?" min="0" required placeholder="500" readonly />
              </div>
            </div>

            <div class="form-group">
              <label class="col-sm-3 control-label">Present <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="slr_pre" id="slr_pre" value="<?php if($row_state->slr_pre!="") { echo $row_state->slr_pre; }  ?>" class="form-control" pattern="\d+(\.\d{1,2})?" min="0" required placeholder="25" />
              </div>
            </div>
            <div class="form-group">
              <label class="col-sm-3 control-label">Absent <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="slr_abs" id="slr_abs" value="<?php if($row_state->slr_abs!="") { echo $row_state->slr_abs; }  ?>" class="form-control" pattern="\d+(\.\d{1,2})?" min="0" required placeholder="5" />
              </div>
            </div>

                   


                 
                 
                 
                <div class="form-group">
                  <label class="col-sm-3 control-label">Status <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <select required class="form-control" name="slr_status">
                      <?php
                      $query_status = "SELECT * FROM status_detail WHERE status_id IN (1,2)";
                      $result_status = $con->query( $query_status );
                      while ( $row_status = $result_status->fetch_object() ) {
                        ?>
                      <option <?php if ($row_status->status_id == $row_state->slr_status) { ?>selected<?php } ?> value="<?php echo $row_status->status_id ?>"> <?php echo $row_status->status_name ?> </option>
                      <?php } ?>
                    </select>
                  </div>
                </div>
              </div>
              <!-- panel-body -->
              <div class="panel-footer">
                <div class="row">
                  <div class="col-sm-9 col-sm-offset-3">
                    <input type="submit" name="submit" value="Edit" class="btn btn-primary" onClick="return validation();">
                    <input type="reset" style="background:#FFFFFF" class="btn btn-default" value="Cancel" onClick="location.href='salary_view.php'">
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
<script src="js/jquery.prettyPhoto.js"></script> 
<script src="js/wysihtml5-0.3.0.min.js"></script> 
<script src="js/bootstrap-wysihtml5.js"></script> 

<script src="js/custom.js"></script> 

<script>
    // Function to calculate pending fix_sal
    function calculatePendingAmount() {
      var fix_sal = parseFloat(document.getElementById('slr_fix').value) || 0;
      var paid = parseFloat(document.getElementById('slr_paid').value) || 0;

      if (paid > fix_sal) {
        alert("Paid cannot be greater than the fix salary.");
        document.getElementById('slr_paid').value = fix_sal.toFixed(2);
        // document.getElementById('slr_paid').value = 0;
        paid = fix_sal;
      }

      var deduction = fix_sal - paid;
      document.getElementById('slr_ded').value = deduction.toFixed(2);
    }

    // Attach the function to input change events
    document.getElementById('slr_fix').addEventListener('input', calculatePendingAmount);
    document.getElementById('slr_paid').addEventListener('input', calculatePendingAmount);
  </script>
</body>
</html>