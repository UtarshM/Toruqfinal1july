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

define( 'FPDF_FONTPATH', 'font/' );
require( 'invoice.php' );

$col_cdo = "SELECT * FROM salary_detail cd where slr_code_no LIKE 'SALARY%' ORDER BY cd.slr_id DESC";
$result_col_cdo = $con->query( $col_cdo );
$total_records = $result_col_cdo->num_rows+1;
$slr_code_no = "SALARY".$total_records; 
// echo $colc_id_max; exit;


if ( isset( $_POST[ "submit" ] ) ) 
{
  $branch_id = $_SESSION[ 'adm_branch' ];
  $slr_date = addslashes( $_POST[ "slr_date" ] );
  $adm_id = addslashes( $_POST[ "adm_id" ] );
  $slr_fix = addslashes( $_POST[ "slr_fix" ] );
  $slr_paid = addslashes( $_POST[ "slr_paid" ] );
  $slr_ded = addslashes( $_POST[ "slr_ded" ] );
  $slr_pre = addslashes( $_POST[ "slr_pre" ] );
  $slr_abs = addslashes( $_POST[ "slr_abs" ] );


  $datend = new DateTime( $slr_date );
  $invDate = $datend->format( 'd-m-Y' );
  $slr_status = addslashes( $_POST[ "slr_status" ] );
  $added_date = date( 'Y-m-d H:i:s' );
  $updated_date = date( 'Y-m-d H:i:s' );
  $added_by = $_SESSION[ 'adm_id' ];
  $updated_by = $_SESSION[ 'adm_id' ];

   

  $sql_expe_ins = "INSERT INTO salary_detail (branch_id,slr_code_no, slr_date, adm_id, slr_fix, slr_paid, slr_ded, slr_pre, slr_abs, added_by, updated_by, slr_status, added_date, updated_date) VALUES ('" . $branch_id . "','" . $slr_code_no . "','" . $slr_date . "','" . $adm_id . "','" . $slr_fix . "','" . $slr_paid . "','" . $slr_ded . "','" . $slr_pre . "','" . $slr_abs . "','" . $added_by . "','" . $updated_by . "','" . $slr_status . "','" . $added_date . "','" . $updated_date . "')";
  if ( $con->query( $sql_expe_ins ) === TRUE ) {
    header( 'Location: salary_view.php?flag=1' );
  } else {
    header( 'Location: salary_add.php' );
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
<title>Add Salary  -<?php echo $meta_title; ?></title>
<link href="css/style.default.css" rel="stylesheet">
<link rel="stylesheet" href="css/bootstrap-wysihtml5.css" />
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
  <h2><i class="fa fa-plus"></i> Add Salary  </h2>
  <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
    <ol class="breadcrumb">
      <li><a style="color:#1C1B17;" href="#">Dashboard</a></li>
      <li class="active">Add Salary </li>
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
                <input type="text" disabled class="form-control" placeholder="" value="<?php echo $slr_code_no; ?>"  />
              </div>
            </div>
            <div class="form-group">
              <label class="col-sm-3 control-label">Date <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="date" name="slr_date" class="form-control" placeholder="Type dob..." value="<?php $datend   = new DateTime(); echo $datend->format('Y-m-d'); ?>" required />
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
                  <option value="<?php echo $row_admin->adm_id?>" <?php if ($row_admin->adm_id==$row_frm_d->adm_id) { ?>selected<?php } ?> > <?php echo $row_admin->adm_username?> </option>
                  <?php } ?>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label class="col-sm-3 control-label">Fix Salary  <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="slr_fix" id="slr_fix" value="<?php if($slr_fix!="") { echo $slr_fix; }  ?>" class="form-control" pattern="\d+(\.\d{1,2})?" min="0" required placeholder="500" />
              </div>
            </div>
            <div class="form-group">
              <label class="col-sm-3 control-label">Paid Amount <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="slr_paid" id="slr_paid" value="<?php if($slr_paid!="") { echo $slr_paid; }  ?>" class="form-control" pattern="\d+(\.\d{1,2})?" min="0" required placeholder="500" />
              </div>
            </div>
            <div class="form-group">
              <label class="col-sm-3 control-label">Deduction Amount  <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="slr_ded" id="slr_ded" value="<?php if($slr_ded!="") { echo $slr_ded; }  ?>" class="form-control" pattern="\d+(\.\d{1,2})?" min="0" required placeholder="500" readonly />
              </div>
            </div>

            <div class="form-group">
              <label class="col-sm-3 control-label">Present <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="slr_pre" id="slr_pre" value="<?php if($slr_pre!="") { echo $slr_pre; }  ?>" class="form-control" pattern="\d+(\.\d{1,2})?" min="0" required placeholder="25" />
              </div>
            </div>
            <div class="form-group">
              <label class="col-sm-3 control-label">Absent <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="slr_abs" id="slr_abs" value="<?php if($slr_abs!="") { echo $slr_abs; }  ?>" class="form-control" pattern="\d+(\.\d{1,2})?" min="0" required placeholder="5" />
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
                  <option <?php if ($row_status->status_id == 1) { ?>selected<?php } ?> value="<?php echo $row_status->status_id ?>"> <?php echo $row_status->status_name ?> </option>
                  <?php } ?>
                </select>
              </div>
            </div>
            <div class="panel-footer">
              <div class="row">
                <div class="col-sm-9 col-sm-offset-3">
                  <input type="submit" name="submit" value="Submit" class="btn btn-primary" onClick="return validation();">
                  <button type="reset" class="btn btn-default">Reset </button>
                </div>
              </div>
            </div>
          </div>
          <!-- panel --> 
        </div>
      </form>
      <!-- col-md-6 --> 
    </div>
    <!--row --> 
  </div>
  <!-- contentpanel --> 
</div>
<!-- mainpanel -->
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