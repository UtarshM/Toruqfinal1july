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
if ( !in_array( "15", $md_right ) ) {
  header( 'Location: #' );
}
// Check Module Rights

define( 'FPDF_FONTPATH', 'font/' );
require( 'invoice.php' );

$col_cdo = "SELECT * FROM ughrani_detail cd where ugh_code_no LIKE 'UGHRANI%' ORDER BY cd.ugh_id DESC";
$result_col_cdo = $con->query( $col_cdo );
$total_records = $result_col_cdo->num_rows+1;
$ugh_code_no = "UGHRANI".$total_records; 
// echo $colc_id_max; exit;
if ( isset( $_POST[ "submit" ] ) ) 
{
  $branch_id = $_SESSION[ 'adm_branch' ];
  $ugh_descripiton = addslashes( $_POST[ "ugh_descripiton" ] );
  $ugh_due_date = addslashes( $_POST[ "ugh_due_date" ] );
   
  $ugh_action = addslashes( $_POST[ "ugh_action" ] );
  $ugh_amount = addslashes( $_POST[ "ugh_amount" ] );
  $ugh_name = addslashes( $_POST[ "ugh_name" ] );
  $ugh_contact = addslashes( $_POST[ "ugh_contact" ] );
  $ugh_date = addslashes( $_POST[ "ugh_date" ] );
  $datend = new DateTime( $ugh_date );
  $invDate = $datend->format( 'd-m-Y' );
  $ugh_status = addslashes( $_POST[ "ugh_status" ] );
  $added_date = date( 'Y-m-d H:i:s' );
  $updated_date = date( 'Y-m-d H:i:s' );
  $added_by = $_SESSION[ 'adm_id' ];
  $updated_by = $_SESSION[ 'adm_id' ];

  $sql_expe_ins = "INSERT INTO ughrani_detail (branch_id,ugh_code_no, ugh_descripiton, ugh_due_date, ugh_action,  ugh_amount, ugh_name, ugh_contact, ugh_date, added_by, updated_by, ugh_status, added_date, updated_date) VALUES ('" . $branch_id . "','" . $ugh_code_no . "','" . $ugh_descripiton . "','" . $ugh_due_date . "','" . $ugh_action . "','" . $ugh_amount . "','" . $ugh_name . "','" . $ugh_contact . "','" . $ugh_date . "', '" . $added_by . "','" . $updated_by . "','" . $ugh_status . "','" . $added_date . "','" . $updated_date . "')";
  if ( $con->query( $sql_expe_ins ) === TRUE ) {
    header( 'Location: ughrani_view.php?flag=1' );
  } else {
    header( 'Location: ughrani_add.php' );
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
<title>Add Ughrani  -<?php echo $meta_title; ?></title>
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
  <h2><i class="fa fa-plus"></i> Add Ughrani  </h2>
  <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
    <ol class="breadcrumb">
      <li><a style="color:#1C1B17;" href="#">Dashboard</a></li>
      <li class="active">Add Ughrani </li>
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
            <h4 class="panel-title">Ughrani Details</h4>
            <p>Please set ughrani details here</p>
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
                <input type="text" disabled class="form-control" placeholder="" value="<?php echo $ugh_code_no; ?>"  />
              </div>
            </div>
            <div class="form-group">
              <label class="col-sm-3 control-label">Date <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="date" name="ugh_date" class="form-control" placeholder="Type dob..." value="<?php $datend   = new DateTime(); echo $datend->format('Y-m-d'); ?>" required />
              </div>
            </div>
            <div class="form-group">
              <label class="col-sm-3 control-label">Name <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
              <input type="text" name="ugh_name" class="form-control" placeholder="ex: John Doe" required > 
              </div>
            </div>
            <div class="form-group">
              <label class="col-sm-3 control-label">Contact No. <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
              <input type="text" name="ugh_contact" pattern="\d*" minlength="10" class="form-control" maxlength="10" placeholder="ex: 9898989898" required > 
              </div>
            </div>
            <div class="form-group">
              <label class="col-sm-3 control-label">Descripiton  <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="ugh_descripiton" class="form-control" placeholder="ex: details type here" required />
              </div>
            </div>

            <div class="form-group">
              <label class="col-sm-3 control-label">Amount <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="number" min="0" name="ugh_amount" class="form-control" placeholder="ex: 500" required />
              </div>
            </div>
            
            

             

            <div class="form-group">
              <label class="col-sm-3 control-label">Due Date <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="date" name="ugh_due_date" class="form-control" placeholder="Type dob..." value="<?php $datend   = new DateTime(); echo $datend->format('Y-m-d'); ?>" required />
              </div>
            </div>

            


            <div class="form-group">
              <label class="col-sm-3 control-label">Action <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="ugh_action">
                  <option value="">Select Action</option>
                  <option value="1" selected>Pending</option>
                  <option value="2">Completed</option>
                 </select>
              </div>
            </div>



           
     
             
            
            <div class="form-group">
              <label class="col-sm-3 control-label">Status <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="ugh_status">
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

 

</body>
</html>