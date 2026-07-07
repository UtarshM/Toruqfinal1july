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
if ( !in_array( "13", $md_right ) ) {
  header( 'Location: #' );
}
// Check Module Rights

define( 'FPDF_FONTPATH', 'font/' );
require( 'invoice.php' );

$col_cdo = "SELECT * FROM cheque_detail cd where chq_code_no LIKE 'CHEQUE%' ORDER BY cd.chq_id DESC";
$result_col_cdo = $con->query( $col_cdo );
$total_records = $result_col_cdo->num_rows+1;
$chq_code_no = "CHEQUE".$total_records; 
// echo $colc_id_max; exit;


if ( isset( $_POST[ "submit" ] ) ) 
{
  $branch_id = $_SESSION[ 'adm_branch' ];
  $chq_bank = addslashes( $_POST[ "chq_bank" ] );
  $chq_dc_action = addslashes( $_POST[ "chq_dc_action" ] );
  $chq_cour_det = addslashes( $_POST[ "chq_cour_det" ] );
  $chq_dc_date = addslashes( $_POST[ "chq_dc_date" ] );
  $chq_cshb_amt = addslashes( $_POST[ "chq_cshb_amt" ] );
  $chq_cshb_action = addslashes( $_POST[ "chq_cshb_action" ] );
  $chq_action = addslashes( $_POST[ "chq_action" ] );
   
  $chq_amount = addslashes( $_POST[ "chq_amount" ] );
  $chq_regno = addslashes( $_POST[ "chq_regno" ] );
  $chq_no = addslashes( $_POST[ "chq_no" ] );
  $chq_date = addslashes( $_POST[ "chq_date" ] );
  $datend = new DateTime( $chq_date );
  $invDate = $datend->format( 'd-m-Y' );
  $chq_status = addslashes( $_POST[ "chq_status" ] );
  $added_date = date( 'Y-m-d H:i:s' );
  $updated_date = date( 'Y-m-d H:i:s' );
  $added_by = $_SESSION[ 'adm_id' ];
  $updated_by = $_SESSION[ 'adm_id' ];

   

  $sql_expe_ins = "INSERT INTO cheque_detail (branch_id,chq_code_no, chq_bank, chq_dc_action, chq_cour_det, chq_dc_date, chq_cshb_amt, chq_cshb_action, chq_action,  chq_amount, chq_regno, chq_no, chq_date, added_by, updated_by, chq_status, added_date, updated_date) VALUES ('" . $branch_id . "','" . $chq_code_no . "','" . $chq_bank . "','" . $chq_dc_action . "','" . $chq_cour_det . "','" . $chq_dc_date . "','" . $chq_cshb_amt . "','" . $chq_cshb_action . "','" . $chq_action . "','" . $chq_amount . "','" . $chq_regno . "','" . $chq_no . "','" . $chq_date . "', '" . $added_by . "','" . $updated_by . "','" . $chq_status . "','" . $added_date . "','" . $updated_date . "')";
  if ( $con->query( $sql_expe_ins ) === TRUE ) {
    header( 'Location: cheque_view.php?flag=1' );
  } else {
    header( 'Location: cheque_add.php' );
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
<title>Add Cheque  -<?php echo $meta_title; ?></title>
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
  <h2><i class="fa fa-plus"></i> Add Cheque  </h2>
  <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
    <ol class="breadcrumb">
      <li><a style="color:#1C1B17;" href="#">Dashboard</a></li>
      <li class="active">Add Cheque </li>
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
            <h4 class="panel-title">Cheque Details</h4>
            <p>Please set cheque details here</p>
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
                <input type="text" disabled class="form-control" placeholder="" value="<?php echo $chq_code_no; ?>"  />
              </div>
            </div>
            <div class="form-group">
              <label class="col-sm-3 control-label">Date <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="date" name="chq_date" class="form-control" placeholder="Type dob..." value="<?php $datend   = new DateTime(); echo $datend->format('Y-m-d'); ?>" required />
              </div>
            </div>
            <div class="form-group">
              <label class="col-sm-3 control-label">Reg. No <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
              <input type="text" name="chq_regno" class="form-control" placeholder="ex: GJ01JL0123" required > 
              </div>
            </div>
            <div class="form-group">
              <label class="col-sm-3 control-label">Cheque No <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
              <input type="text" name="chq_no" pattern="\d*" minlength="6" class="form-control" maxlength="6" placeholder="ex: 006598" required > 
              </div>
            </div>
            <div class="form-group">
              <label class="col-sm-3 control-label">Amount <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="number" min="0" name="chq_amount" class="form-control" placeholder="ex: 500" required />
              </div>
            </div>
            
            <div class="form-group">
              <label class="col-sm-3 control-label">Bank  <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="chq_bank" class="form-control" placeholder="ex: State Bank of India" required />
              </div>
            </div>

            <div class="form-group">
              <label class="col-sm-3 control-label">D/C Action <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="chq_dc_action">
                  <option value="">Select D/C</option>
                  <option value="1">Deposite</option>
                  <option value="2">Courier</option>
                 </select>
              </div>
            </div>

            <div class="form-group" id="pen_show">
              <label class="col-sm-3 control-label">D/C Details <span class="asterisk">*</span></label>
              <div class="col-sm-9">
              <input type="text" name="chq_cour_det" class="form-control" placeholder="ex: Name, Address" />
                
              </div>
            </div>

            <div class="form-group">
              <label class="col-sm-3 control-label">D/C Date <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="date" name="chq_dc_date" class="form-control" placeholder="Type dob..." value="<?php $datend   = new DateTime(); echo $datend->format('Y-m-d'); ?>" required />
              </div>
            </div>

            <div class="form-group">
              <label class="col-sm-3 control-label">Cashback Amount </label>
              <div class="col-sm-9">
                <input type="number" min="0" name="chq_cshb_amt" class="form-control" placeholder="ex: 500" />
              </div>
            </div>

            <div class="form-group">
              <label class="col-sm-3 control-label">Cashback Status</label>
              <div class="col-sm-9">
                <select class="form-control" name="chq_cshb_action">
                  <option value="">Select Cashback Status</option>
                  <option value="1">Pending</option>
                  <option value="2">Given</option>
                 </select>
              </div>
            </div>


            <div class="form-group">
              <label class="col-sm-3 control-label">Action <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="chq_action">
                  <option value="">Select Action</option>
                  <option value="1" selected>Pending</option>
                  <option value="2">Cleared</option>
                  <option value="3">Bounce</option>
                 </select>
              </div>
            </div>



           
     
             
            
            <div class="form-group">
              <label class="col-sm-3 control-label">Status <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="chq_status">
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
    $(document).ready(function() {
      // Hide the "pen_show" div initially
      $("#pen_show").hide();

      // Listen for changes in the "chq_dc_action" select element
      $("select[name='chq_dc_action']").change(function() {
        // Get the selected value
        var selectedValue = $(this).val();

        // Check if the selected value is '2' (Rejected)
        if (selectedValue === '2') {
          // Show the "pen_show" div
          $("#pen_show").show();
          // Make the "chq_cour_det" select required
          $("select[name='chq_cour_det']").prop('required', true);
        } else {
          // Hide the "pen_show" div
          $("#pen_show").hide();
          // Remove the required attribute from the "chq_cour_det" select
          $("select[name='chq_cour_det']").prop('required', false);
        }
      });
    });
  </script>

</body>
</html>