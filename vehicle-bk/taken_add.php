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
if ( !in_array( "3", $md_right ) ) {
  header( 'Location: insurance_dashboard.php' );
}
// Check Module Rights

 
$col_cdo = "SELECT * FROM taken_detail cd where tkn_code_no LIKE 'TKN%' ORDER BY cd.tkn_id DESC";
$result_col_cdo = $con->query( $col_cdo );
$total_records = $result_col_cdo->num_rows + 1;
$tkn_code_no = "TKN" . $total_records;
// echo $tkn_code_no; exit;
if ( isset( $_POST[ "submit" ] ) ) {
  
  $branch_id = $_SESSION[ 'adm_branch' ];
  $tkn_adm_id = addslashes( $_POST[ "tkn_adm_id" ] );
  $tkn_date = addslashes( $_POST[ "tkn_date" ] );
  $tkn_name = addslashes( $_POST[ "tkn_name" ] );
  $tkn_series = addslashes( $_POST[ "tkn_series" ] );
  $tkn_fname = addslashes( $_POST[ "tkn_fname" ] );
  $tkn_address = addslashes( $_POST[ "tkn_address" ] );
  $tkn_chassis = addslashes( $_POST[ "tkn_chassis" ] );
  $tkn_engine = addslashes( $_POST[ "tkn_engine" ] );
  $tkn_contact = addslashes( $_POST[ "tkn_contact" ] );
  $tkn_altcontact = addslashes( $_POST[ "tkn_altcontact" ] );
  $tkn_category = addslashes( $_POST[ "tkn_category" ] );
  $tkn_reg_no = addslashes( $_POST[ "tkn_reg_no" ] );
  $tkn_vmodel = addslashes( $_POST[ "tkn_vmodel" ] );
  $tkn_insurance_date = addslashes( $_POST[ "tkn_insurance_date" ] );
  $tkn_cf_date = addslashes( $_POST[ "tkn_cf_date" ] );
  $tkn_reg_date = addslashes( $_POST[ "tkn_reg_date" ] );
  $tkn_permit_date = addslashes( $_POST[ "tkn_permit_date" ] );
  $tkn_nat_permit_date = addslashes( $_POST[ "tkn_nat_permit_date" ] );
  $tkn_tax_date = addslashes( $_POST[ "tkn_tax_date" ] );
  $tkn_qut_date = addslashes( $_POST[ "tkn_qut_date" ] );
  
  $tkn_remarks = addslashes( $_POST[ "tkn_remarks" ] );
  
  $tkn_status = addslashes( $_POST[ "tkn_status" ] );
  $tkn_action = addslashes( $_POST[ "tkn_action" ] );
  $rej_res_id = addslashes( $_POST[ "rej_res_id" ] );
  $added_date = date( 'Y-m-d H:i:s' );
  $updated_date = date( 'Y-m-d H:i:s' );
  $added_by = $_SESSION[ 'adm_id' ];
  $updated_by = $_SESSION[ 'adm_id' ];

  // Check  Duplicate Record
  $query_tkn_dup = "SELECT * FROM taken_detail where tkn_reg_no='".$tkn_reg_no."' and tkn_insurance_date='".$tkn_insurance_date."' and tkn_status!='3' and tkn_action!='3'";
  $result_tkn_dup = $con->query( $query_tkn_dup );
  $total_records_tkn_dup = $result_tkn_dup->num_rows;
  if ( $total_records_tkn_dup >= 1 ) {
    $flag = 11;
    $tkn_date = $tkn_date;
    $tkn_name = $tkn_name;
    $tkn_series = $tkn_series;
    $tkn_fname = $tkn_fname;
    $tkn_address = $tkn_address;
    $tkn_chassis = $tkn_chassis;
    $tkn_engine = $tkn_engine;
    $tkn_contact = $tkn_contact;
    $tkn_altcontact = $tkn_altcontact;
    $tkn_category = $tkn_category;
    $tkn_reg_no = $tkn_reg_no;
    $tkn_vmodel = $tkn_vmodel;
    $tkn_insurance_date = $tkn_insurance_date;
    $tkn_cf_date = $tkn_cf_date;
    $tkn_reg_date = $tkn_reg_date;
    $tkn_permit_date = $tkn_permit_date;
    $tkn_nat_permit_date = $tkn_nat_permit_date;
    $tkn_tax_date = $tkn_tax_date;
    $tkn_qut_date = $tkn_qut_date;
    $tkn_remarks = $tkn_remarks;
  } else {
   $sql_expe_ins = "INSERT INTO taken_detail (branch_id, tkn_code_no,  tkn_adm_id, tkn_date, tkn_series, tkn_name, tkn_fname, tkn_address, tkn_chassis, tkn_engine, tkn_contact, tkn_altcontact, tkn_reg_no, tkn_vmodel, tkn_category, tkn_insurance_date, tkn_cf_date, tkn_reg_date, tkn_permit_date, tkn_nat_permit_date, tkn_tax_date, tkn_qut_date,  tkn_remarks, added_by, updated_by, tkn_status, tkn_action, rej_res_id, added_date, updated_date) VALUES ('" . $branch_id . "','" . $tkn_code_no . "','" . $tkn_adm_id . "','" . $tkn_date . "','" . $tkn_series . "','" . $tkn_name . "','" . $tkn_fname . "','" . $tkn_address . "','" . $tkn_chassis . "','" . $tkn_engine . "','" . $tkn_contact . "', '" . $tkn_altcontact . "','" . $tkn_reg_no . "','" . $tkn_vmodel . "','" . $tkn_category . "','" . $tkn_insurance_date . "','" . $tkn_cf_date . "','" . $tkn_reg_date . "','" . $tkn_permit_date . "','" . $tkn_nat_permit_date . "','" . $tkn_tax_date . "','" . $tkn_qut_date . "', '" . $tkn_remarks . "','" . $added_by . "','" . $updated_by . "','" . $tkn_status . "','" . $tkn_action . "','" . $rej_res_id . "','" . $added_date . "','" . $updated_date . "')";

    // echo $sql_expe_ins; exit;
    if ( $con->query( $sql_expe_ins ) === TRUE ) {
      header( 'Location: taken_view.php?flag=1' );
    } else {
      header( 'Location: taken_add.php' );
    }
  }
  // Check  Duplicate Record
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Add Taken  -<?php echo $meta_title; ?></title>
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
  <h2><i class="fa fa-plus"></i> Add Taken </h2>
  <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
    <ol class="breadcrumb">
      <li><a style="color:#1C1B17;" href="insurance_dashboard.php">Dashboard</a></li>
      <li class="active">Add Taken </li>
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
            <h4 class="panel-title">Taken Details</h4>
            <?php if(isset($flag)==11){?>
            <p style="color:red;">This registration no. is already exists</p>
            <?php } ?>
            <p>Please set Taken details here.</p>
          </div>
          <div class="panel-body">
            
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Taken Code <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="text" disabled class="form-control" value="<?php echo $tkn_code_no; ?>"  />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Series <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="tkn_series" class="form-control" required value="<?php echo $tkn_series; ?>" placeholder="ex: A" />
              </div>
            </div>
             
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Date <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="date" name="tkn_date" class="form-control" placeholder="Type dob..." value="<?php $datend   = new DateTime(); echo $datend->format('Y-m-d'); ?>" required />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Register No. <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="tkn_reg_no" class="form-control" required value="<?php echo $tkn_reg_no; ?>" placeholder="GJ01CV0267"  />
              </div>
            </div>
            
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Name <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="tkn_name" class="form-control" required value="<?php echo $tkn_name; ?>" placeholder="Jakirhusen Parasara" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Mobile No.  <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="tkn_contact" value="<?php echo $tkn_contact; ?>" class="form-control" pattern="\d*" minlength="10" maxlength="10"  required placeholder="9898569898" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Alt Mobile No.</label>
              <div class="col-sm-9">
                <input type="phone" name="tkn_altcontact" value="<?php echo $tkn_altcontact; ?>" class="form-control" pattern="\d*" minlength="10" maxlength="10"  placeholder="9898569898" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Model <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="tkn_vmodel" class="form-control" required value="<?php echo $tkn_vmodel; ?>" placeholder="Super Carry Std Cng" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Category <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <!-- <input type="text" name="tkn_category" class="form-control" value="<?php // echo $tkn_category; ?>" placeholder="HGV" /> -->
                <select required class="form-control" name="tkn_category">
                <option value="">Select Category</option>
                  <option <?php if ($tkn_category == "LCV") { ?>selected<?php } ?> value="LCV">LCV</option>
                  <option <?php if ($tkn_category == "HGV") { ?>selected<?php } ?> value="HGV">HGV</option>
                  <option <?php if ($tkn_category == "LMV") { ?>selected<?php } ?> value="LMV">LMV</option>
                  <option <?php if ($tkn_category == "3W PCV") { ?>selected<?php } ?> value="3W PCV">3W PCV</option>
                  <option <?php if ($tkn_category == "3W GCV") { ?>selected<?php } ?> value="3W GCV">3W GCV</option>
                  <option <?php if ($tkn_category == "2W") { ?>selected<?php } ?> value="2W">2W</option>
                  <option <?php if ($tkn_category == "TAXI") { ?>selected<?php } ?> value="TAXI">TAXI</option>
                  <option <?php if ($tkn_category == "BUS") { ?>selected<?php } ?> value="BUS">BUS</option>
                  <option <?php if ($tkn_category == "STAFF BUS") { ?>selected<?php } ?> value="STAFF BUS">STAFF BUS</option>
                  <option <?php if ($tkn_category == "SCHOOL BUS") { ?>selected<?php } ?> value="SCHOOL BUS">SCHOOL BUS</option>
                  <option <?php if ($tkn_category == "OTHER") { ?>selected<?php } ?> value="OTHER">OTHER</option> 
                </select>
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Father Name </label>
              <div class="col-sm-9">
                <input type="text" name="tkn_fname" class="form-control" value="<?php echo $tkn_fname; ?>" placeholder="Alibhai Parasara" />
              </div>
            </div>
           
            
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Address </label>
              <div class="col-sm-9">
                <textarea name="tkn_address" class="form-control" cols="30" rows="2" placeholder="ex: Type address..."><?php echo $tkn_address; ?></textarea>                 
              </div>
            </div>
            
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">GVW</label>
              <div class="col-sm-9">
                <input type="text" name="tkn_chassis" class="form-control" value="<?php echo $tkn_chassis; ?>" placeholder="11990"  />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Insurance Company <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <!-- <input type="text" name="tkn_engine" class="form-control" value="<?php // echo $tkn_engine; ?>" placeholder="Tata AIG General Insurance"  /> -->
                <select required class="form-control" name="tkn_engine">
                  <option value="">Select Insurance Company</option>
                  <option <?php if ($tkn_engine == "HDFC") { ?>selected<?php } ?> value="HDFC">HDFC</option>
                  <option <?php if ($tkn_engine == "ICICI") { ?>selected<?php } ?> value="ICICI">ICICI</option>
                  <option <?php if ($tkn_engine == "RELIANCE") { ?>selected<?php } ?> value="RELIANCE">RELIANCE</option>
                  <option <?php if ($tkn_engine == "TATA AIG") { ?>selected<?php } ?> value="TATA AIG">TATA AIG</option>
                  <option <?php if ($tkn_engine == "GO DIGIT") { ?>selected<?php } ?> value="GO DIGIT">GO DIGIT</option>
                  <option <?php if ($tkn_engine == "CHOLA MS") { ?>selected<?php } ?> value="CHOLA MS">CHOLA MS</option>
                  <option <?php if ($tkn_engine == "BAJAJ") { ?>selected<?php } ?> value="BAJAJ">BAJAJ</option>
                  <option <?php if ($tkn_engine == "MAGMA") { ?>selected<?php } ?> value="MAGMA">MAGMA</option>
                  <option <?php if ($tkn_engine == "UNITED") { ?>selected<?php } ?> value="UNITED">UNITED</option>
                  <option <?php if ($tkn_engine == "NEW INDIA") { ?>selected<?php } ?> value="NEW INDIA">NEW INDIA</option>
                  <option <?php if ($tkn_engine == "ORIENTAL") { ?>selected<?php } ?> value="ORIENTAL">ORIENTAL</option>
                  <option <?php if ($tkn_engine == "SBI") { ?>selected<?php } ?> value="SBI">SBI</option>
                  <option <?php if ($tkn_engine == "FUTURE") { ?>selected<?php } ?> value="FUTURE">FUTURE</option>
                  <option <?php if ($tkn_engine == "UNIVERSAL SOMPO") { ?>selected<?php } ?> value="UNIVERSAL SOMPO">UNIVERSAL SOMPO</option>
                  <option <?php if ($tkn_engine == "SHRIRAM") { ?>selected<?php } ?> value="SHRIRAM">SHRIRAM</option>
                  <option <?php if ($tkn_engine == "NATIONAL") { ?>selected<?php } ?> value="NATIONAL">NATIONAL</option>
                  <option <?php if ($tkn_engine == "IFFCO") { ?>selected<?php } ?> value="IFFCO">IFFCO</option>
                  <option <?php if ($tkn_engine == "LIBERTY") { ?>selected<?php } ?> value="LIBERTY">LIBERTY</option>
                  <option <?php if ($tkn_engine == "ROYAL SUNDARAM") { ?>selected<?php } ?> value="ROYAL SUNDARAM">ROYAL SUNDARAM</option>
                  <option <?php if ($tkn_engine == "ZUNO") { ?>selected<?php } ?> value="ZUNO">ZUNO</option>
                  <option <?php if ($tkn_engine == "KOTAK") { ?>selected<?php } ?> value="KOTAK">KOTAK</option>
              </select>
              </div>
            </div>
            
            
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Insurance Date </label>
              <div class="col-sm-9">
                <input type="date" name="tkn_insurance_date" class="form-control" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">CF Date </label>
              <div class="col-sm-9">
                <input type="date" name="tkn_cf_date" class="form-control" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Registration Date </label>
              <div class="col-sm-9">
                <input type="date" name="tkn_reg_date" class="form-control" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Permit Date </label>
              <div class="col-sm-9">
                <input type="date" name="tkn_permit_date" class="form-control" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">National Permit Date </label>
              <div class="col-sm-9">
                <input type="date" name="tkn_nat_permit_date" class="form-control" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">TAX Date </label>
              <div class="col-sm-9">
                <input type="date" name="tkn_tax_date" class="form-control" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Quote Date </label>
              <div class="col-sm-9">
                <input type="date" name="tkn_qut_date" class="form-control" />
              </div>
            </div>
             
            
             
             
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Remarks </label>
              <div class="col-sm-9">
                <textarea name="tkn_remarks" class="form-control" cols="30" rows="2" placeholder="ex: Type remarks..."><?php echo $tkn_remarks; ?></textarea>                 
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Staff<span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="tkn_adm_id" >
                  <option value="" >Select Staff</option>
                   <?php
                  $query_admin = "SELECT * FROM admin_login WHERE adm_status=1 and adm_id!=1 and branch_id=".$_SESSION[ 'adm_branch' ]."";
                  $result_admin = $con->query( $query_admin );
                  while ( $row_admin = $result_admin->fetch_object() ) {
                    ?>
                  <option value="<?php echo $row_admin->adm_id?>" <?php if ($row_admin->adm_id==$row_frm_d->tkn_adm_id) { ?>selected<?php } ?> > <?php echo $row_admin->adm_username?> </option>
                  <?php } ?>
                </select>
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Action <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="tkn_action">
                  <option value="">Select Action</option>
                  <option value="1" selected>Pending</option>
                  <!-- <option value="2">Rejected</option>
                  <option value="3">Completed</option> -->
                </select>
              </div>
            </div>

            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12" id="rej_show">
              <label class="col-sm-3 control-label">Reason <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select class="form-control" name="rej_res_id">
                  <option value="">Select Reason</option>
                  <?php
                  $query_rejres = "SELECT * FROM rej_res_detail WHERE rej_res_status=1";
                  $result_rejres = $con->query( $query_rejres );
                  while ( $row_rejres = $result_rejres->fetch_object() ) {
                  ?>
                  <option value="<?php echo $row_rejres->rej_res_id ?>"><?php echo $row_rejres->rej_res_name ?></option>
                  <?php } ?>
                </select>
              </div>
            </div>

            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Status <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="tkn_status">
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
<script>
    $(document).ready(function() {
      // Hide the "rej_show" div initially
      $("#rej_show").hide();

      // Listen for changes in the "tkn_action" select element
      $("select[name='tkn_action']").change(function() {
        // Get the selected value
        var selectedValue = $(this).val();

        // Check if the selected value is '2' (Rejected)
        if (selectedValue === '2') {
          // Show the "rej_show" div
          $("#rej_show").show();
          // Make the "rej_res_id" select required
          $("select[name='rej_res_id']").prop('required', true);
        } else {
          // Hide the "rej_show" div
          $("#rej_show").hide();
          // Remove the required attribute from the "rej_res_id" select
          $("select[name='rej_res_id']").prop('required', false);
        }
      });
    });
  </script>
</body>
</html>