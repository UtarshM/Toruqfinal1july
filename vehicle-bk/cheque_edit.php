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

$chq_id = $_GET[ 'chq_id' ];

if ( isset( $_POST[ "submit" ] ) ) {
   
  $chq_bank = addslashes( $_POST[ "chq_bank" ] );
  $chq_dc_action = addslashes( $_POST[ "chq_dc_action" ] );
  $chq_cour_det = addslashes( $_POST[ "chq_cour_det" ] );
  $chq_dc_date = addslashes( $_POST[ "chq_dc_date" ] );
  $chq_cshb_amt = addslashes( $_POST[ "chq_cshb_amt" ] );
  $chq_cshb_action = addslashes( $_POST[ "chq_cshb_action" ] );
  $chq_action = addslashes( $_POST[ "chq_action" ] );
  $chq_amount = addslashes( $_POST[ "chq_amount" ] );
  $chq_no = addslashes( $_POST[ "chq_no" ] );
  $chq_regno = addslashes( $_POST[ "chq_regno" ] );
  $chq_date = addslashes( $_POST[ "chq_date" ] );

   

  $chq_status = addslashes( $_POST[ "chq_status" ] );
  $updated_date = date( 'Y-m-d H:i:s' );
  $updated_by = $_SESSION[ 'adm_id' ];

  $sql_expe_updt = "UPDATE cheque_detail SET chq_dc_action='" . $chq_dc_action . "', chq_cour_det='" . $chq_cour_det . "', chq_dc_date='" . $chq_dc_date . "', chq_cshb_amt='" . $chq_cshb_amt . "', chq_cshb_action='" . $chq_cshb_action . "',chq_action='" . $chq_action . "', chq_bank='" . $chq_bank . "', chq_amount='" . $chq_amount . "',  chq_no='" . $chq_no . "', chq_regno='" . $chq_regno . "',  chq_date='" . $chq_date . "', updated_by='" . $updated_by . "', chq_status='" . $chq_status . "', updated_date='" . $updated_date . "' WHERE chq_id=" . $chq_id;
  if ( $con->query( $sql_expe_updt ) === TRUE ) {
    header( 'Location: cheque_view.php?flag=2' );
  } else {
    header( 'Location: cheque_edit.php?chq_id=' . $chq_id . '' );
  }
}

$query_state_detail = "SELECT * FROM cheque_detail ld where ld.chq_id=" . $chq_id;
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
<title>Cheque Edit   -<?php echo $meta_title; ?></title>
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
      <h2><i class="fa fa-pen"></i> Cheque Edit   </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="#">Dashboard</a></li>
          <li class="active">Cheque Edit  </li>
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
                <input type="text" disabled class="form-control" placeholder="" value="<?php echo $row_state->chq_code_no; ?>"  />
              </div>
            </div>
                <div class="form-group">
                  <label class="col-sm-3 control-label">Date <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="date" name="chq_date" id="chq_date" value="<?php $datend   = new DateTime($row_state->chq_date); echo $datend->format('Y-m-d'); ?>" class="form-control" placeholder="Type dob..." required />
                  </div>
                </div>

                <div class="form-group">
                  <label class="col-sm-3 control-label">Reg. No<span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="text" name="chq_regno" value="<?php echo $row_state->chq_regno ?>" class="form-control" placeholder="ex: GJ01JL0123" required />
                  </div>
                </div>
                
                <div class="form-group">
                  <label class="col-sm-3 control-label">Cheque No<span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="text" name="chq_no" pattern="\d*" minlength="6" maxlength="6" value="<?php echo $row_state->chq_no ?>" class="form-control" placeholder="ex: 006598" required />
                  </div>
                </div>
                
            
                <div class="form-group">
                  <label class="col-sm-3 control-label">Amount <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="number" min="0" name="chq_amount" id="chq_amount" value="<?php echo $row_state->chq_amount ?>" class="form-control" placeholder="ex: 500" required />
                  </div>
                </div>
               
                
               
                <div class="form-group">
                  <label class="col-sm-3 control-label">Bank <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="text" name="chq_bank" id="chq_bank" value="<?php echo $row_state->chq_bank ?>" class="form-control" placeholder="ex: State Bank of India" required />
                  </div>
                </div>
                

                <div class="form-group">
              <label class="col-sm-3 control-label">D/C Action <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="chq_dc_action">
                  <option value="">Select Action</option>
                  <option value="1" <?php if ($row_state->chq_dc_action == 1) { ?>selected<?php } ?>>Deposite</option>
                  <option value="2" <?php if ($row_state->chq_dc_action == 2) { ?>selected<?php } ?>>Courier</option>
                 </select>
              </div>
            </div>
            <?php if ($row_state->chq_dc_action == 2) {  ?>
            <div class="form-group" id="pen_show_2">
              <label class="col-sm-3 control-label">D/C  Details <span class="asterisk">*</span></label>
              <div class="col-sm-9">
              <input type="text" name="chq_cour_det" class="form-control" value="<?php echo $row_state->chq_cour_det ?>" placeholder="ex: Type Name, Address" required />
              </div>
            </div>
            <?php } else { ?>
              <div class="form-group" id="pen_show">
              <label class="col-sm-3 control-label">D/C  Details  <span class="asterisk">*</span></label>
              <div class="col-sm-9">
              <input type="text" name="chq_cour_det" class="form-control" value="<?php echo $row_state->chq_cour_det ?>" placeholder="ex: Type Name, Address" />
              </div>
            </div>
            <?php } ?>

            <div class="form-group">
                  <label class="col-sm-3 control-label">D/C Date <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="date" name="chq_dc_date" id="chq_dc_date" value="<?php $datend   = new DateTime($row_state->chq_dc_date); echo $datend->format('Y-m-d'); ?>" class="form-control" placeholder="Type dob..." required />
                  </div>
                </div>
                
            
                <div class="form-group">
                  <label class="col-sm-3 control-label">Cashback Amount </label>
                  <div class="col-sm-9">
                    <input type="number" min="0" name="chq_cshb_amt" id="chq_cshb_amt" value="<?php echo $row_state->chq_cshb_amt ?>" class="form-control" placeholder="ex: 500" />
                  </div>
                </div>

                <div class="form-group">
              <label class="col-sm-3 control-label">Cashback Status </label>
              <div class="col-sm-9">
                <select class="form-control" name="chq_cshb_action">
                  <option value="">Select Cashback Status</option>
                  <option value="1" <?php if($row_state->chq_cshb_action==1) { echo "selected"; } ?>>Pending</option>
                  <option value="2" <?php if($row_state->chq_cshb_action==2) { echo "selected"; } ?>>Given</option>
                 </select>
              </div>
            </div>


            <div class="form-group">
              <label class="col-sm-3 control-label">Action <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="chq_action">
                  <option value="">Select Action</option>
                  <option value="1" <?php if($row_state->chq_action==1) { echo "selected"; } ?>>Pending</option>
                  <option value="2"  <?php if($row_state->chq_action==2) { echo "selected"; } ?>>Cleared</option>
                  <option value="3"  <?php if($row_state->chq_action==3) { echo "selected"; } ?>>Bounce</option>
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
                      <option <?php if ($row_status->status_id == $row_state->chq_status) { ?>selected<?php } ?> value="<?php echo $row_status->status_id ?>"> <?php echo $row_status->status_name ?> </option>
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
                    <input type="reset" style="background:#FFFFFF" class="btn btn-default" value="Cancel" onClick="location.href='cheque_view.php'">
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