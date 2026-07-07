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
if ( !in_array( "5", $md_right ) ) {
  header( 'Location: rto_dashboard.php' );
}
// Check Module Rights

 
$col_cdo = "SELECT * FROM rto_detail cd where rot_code_no LIKE 'RTO%' ORDER BY cd.rot_id DESC";
$result_col_cdo = $con->query( $col_cdo );
$total_records = $result_col_cdo->num_rows + 1;
$rot_code_no = "RTO" . $total_records;
// echo $rot_code_no; exit;
if ( isset( $_POST[ "submit" ] ) ) {
  
  $branch_id = $_SESSION[ 'adm_branch' ];
  $rot_adm_id = addslashes( $_POST[ "rot_adm_id" ] );
  $rot_date = addslashes( $_POST[ "rot_date" ] );
  $rot_name = addslashes( $_POST[ "rot_name" ] );
  $rot_fname = addslashes( $_POST[ "rot_fname" ] );
  $rot_address = addslashes( $_POST[ "rot_address" ] );
   $rot_contact = addslashes( $_POST[ "rot_contact" ] );
  $service_id = addslashes( $_POST[ "service_id" ] );
  $rot_reg_no = addslashes( $_POST[ "rot_reg_no" ] );
  $rot_vmodel = addslashes( $_POST[ "rot_vmodel" ] );
  $rot_appoinment = addslashes( $_POST[ "rot_appoinment" ] );
  $rot_reg_date = addslashes( $_POST[ "rot_reg_date" ] );
   
  $rot_exp_date = addslashes( $_POST[ "rot_exp_date" ] );
  
  $rot_remarks = addslashes( $_POST[ "rot_remarks" ] );
  
  $rot_status = addslashes( $_POST[ "rot_status" ] );
  $added_date = date( 'Y-m-d H:i:s' );
  $updated_date = date( 'Y-m-d H:i:s' );
  $added_by = $_SESSION[ 'adm_id' ];
  $updated_by = $_SESSION[ 'adm_id' ];

  $sql_expe_ins = "INSERT INTO rto_detail (branch_id, rot_code_no,  rot_adm_id, rot_date, rot_name, rot_fname, rot_address, rot_contact, service_id, rot_reg_no, rot_vmodel, rot_appoinment, rot_reg_date,   rot_exp_date,  rot_remarks, added_by, updated_by, rot_status, added_date, updated_date) VALUES ('" . $branch_id . "','" . $rot_code_no . "','" . $rot_adm_id . "','" . $rot_date . "','" . $rot_name . "','" . $rot_fname . "','" . $rot_address . "','" . $rot_contact . "','" . $service_id . "','" . $rot_reg_no . "','" . $rot_vmodel . "','" . $rot_appoinment . "','" . $rot_reg_date . "','" . $rot_exp_date . "', '" . $rot_remarks . "','" . $added_by . "','" . $updated_by . "','" . $rot_status . "','" . $added_date . "','" . $updated_date . "')";

    // echo $sql_expe_ins; exit;
    if ( $con->query( $sql_expe_ins ) === TRUE ) {
      header( 'Location: rto_view.php?flag=1' );
    } else {
      header( 'Location: rto_add.php' );
    }


  // // Check  Duplicate Record
  // $query_rot_dup = "SELECT * FROM rto_detail where rot_reg_no='".$rot_reg_no."' and rot_status!='3'";
  // $result_rot_dup = $con->query( $query_rot_dup );
  // $total_records_rot_dup = $result_rot_dup->num_rows;
  // if ( $total_records_rot_dup >= 1 ) {
  //   $flag = 11;
  //   $rot_date = $rot_date;
  //   $rot_name = $rot_name;
  //   $rot_fname = $rot_fname;
  //   $rot_address = $rot_address;
   
  //   $rot_contact = $rot_contact;
  //   $service_id = $service_id;
  //   $rot_reg_no = $rot_reg_no;
  //   $rot_vmodel = $rot_vmodel;
   //   $rot_appoinment = $rot_appoinment;
   //   $rot_reg_date = $rot_reg_date;
   
  //   $rot_exp_date = $rot_exp_date;
  //   $rot_remarks = $rot_remarks;
  // } else {
    
  // }
  // // Check  Duplicate Record
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Add RTO Task  -<?php echo $meta_title; ?></title>
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
  <h2><i class="fa fa-plus"></i> Add RTO Task </h2>
  <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
    <ol class="breadcrumb">
      <li><a style="color:#1C1B17;" href="rto_dashboard.php">Dashboard</a></li>
      <li class="active">Add RTO Task </li>
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
            <h4 class="panel-title">RTO Task Details</h4>
            <?php if(isset($flag)==11){?>
            <p style="color:red;">This registration no. is already exists</p>
            <?php } ?>
            <p>Please set rto task details here.</p>
          </div>
          <div class="panel-body">
            
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">RTO Task Code <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="text" disabled class="form-control" value="<?php echo $rot_code_no; ?>"  />
              </div>
            </div>
             
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Date <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="date" name="rot_date" class="form-control" placeholder="Type dob..." value="<?php $datend   = new DateTime(); echo $datend->format('Y-m-d'); ?>" required />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Register No. <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="rot_reg_no" class="form-control" required value="<?php echo $rot_reg_no; ?>" placeholder="GJ01CV0267"  />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Name <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="rot_name" class="form-control" required value="<?php echo $rot_name; ?>" placeholder="Jakirhusen Parasara" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Mobile No.  <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="rot_contact" value="<?php echo $rot_contact; ?>" class="form-control" pattern="\d*" minlength="10" maxlength="10"  required placeholder="9898569898" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Service <span class="asterisk">*</span></label>
              <div class="col-sm-9">
              <select required class="form-control" name="service_id" >
                  <option value="" >Select Service</option>
                   <?php
                  $query_service = "SELECT * FROM service_detail WHERE service_status=1 and branch_id=".$_SESSION[ 'adm_branch' ]."";
                  $result_service = $con->query( $query_service );
                  while ( $row_service = $result_service->fetch_object() ) {
                    ?>
                  <option value="<?php echo $row_service->service_id?>"> <?php echo $row_service->service_name?> </option>
                  <?php } ?>
                </select>
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Model <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="rot_vmodel" class="form-control" required value="<?php echo $rot_vmodel; ?>" placeholder="Super Carry Std Cng" />
              </div>
            </div>
            
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Father Name </label>
              <div class="col-sm-9">
                <input type="text" name="rot_fname" class="form-control" value="<?php echo $rot_fname; ?>" placeholder="Alibhai Parasara" />
              </div>
            </div>
           
            
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Address </label>
              <div class="col-sm-9">
                <textarea name="rot_address" class="form-control" cols="30" rows="2" placeholder="ex: Type address..."><?php echo $rot_address; ?></textarea>                 
              </div>
            </div>
            
            
            
             
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Appoinment Date </label>
              <div class="col-sm-9">
                <input type="date" name="rot_appoinment" class="form-control" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Registration Date </label>
              <div class="col-sm-9">
                <input type="date" name="rot_reg_date" class="form-control" />
              </div>
            </div>
             
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Expiry Date </label>
              <div class="col-sm-9">
                <input type="date" name="rot_exp_date" class="form-control" />
              </div>
            </div>
             
            
             
             
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Remarks </label>
              <div class="col-sm-9">
                <textarea name="rot_remarks" class="form-control" cols="30" rows="2" placeholder="ex: Type remarks..."><?php echo $rot_remarks; ?></textarea>                 
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Staff<span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="rot_adm_id" >
                  <option value="" >Select Staff</option>
                   <?php
                  $query_admin = "SELECT * FROM admin_login WHERE adm_status=1 and adm_id!=1 and branch_id=".$_SESSION[ 'adm_branch' ]."";
                  $result_admin = $con->query( $query_admin );
                  while ( $row_admin = $result_admin->fetch_object() ) {
                    ?>
                  <option value="<?php echo $row_admin->adm_id?>" <?php if ($row_admin->adm_id==$row_frm_d->rot_adm_id) { ?>selected<?php } ?> > <?php echo $row_admin->adm_username?> </option>
                  <?php } ?>
                </select>
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Status <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="rot_status">
                  <?php
                  $query_status = "SELECT * FROM status_detail WHERE status_id!=3";
                  $result_status = $con->query( $query_status );
                  while ( $row_status = $result_status->fetch_object() ) {
                    ?>
                  <option <?php if ($row_status->status_id == 1) { ?>selected<?php } ?> value="<?php echo $row_status->status_id ?>"> <?php echo $row_status->status_name ?> </option>
                  <?php } ?>
                </select>
                
              </div>
            </div>
            </div>
            <div class="panel-footer">
              <div class="row">
                <div class="col-sm-12 col-lg-12 col-md-12 col-xs-12 ml_15">
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