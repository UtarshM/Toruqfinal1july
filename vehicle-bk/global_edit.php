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

$glb_id = $_GET[ 'glb_id' ];

if ( isset( $_POST[ "submit" ] ) ) {
  $branch_id = $_SESSION[ 'adm_branch' ];
  $glb_adm_id = addslashes( $_POST[ "glb_adm_id" ] );
  $glb_date = addslashes( $_POST[ "glb_date" ] );
  $glb_name = addslashes( $_POST[ "glb_name" ] );
  $glb_series = addslashes( $_POST[ "glb_series" ] );
  $glb_fname = addslashes( $_POST[ "glb_fname" ] );
  $glb_address = addslashes( $_POST[ "glb_address" ] );
  $glb_chassis = addslashes( $_POST[ "glb_chassis" ] );
  $glb_engine = addslashes( $_POST[ "glb_engine" ] );
  $glb_contact = addslashes( $_POST[ "glb_contact" ] );
  $glb_altcontact = addslashes( $_POST[ "glb_altcontact" ] );
  $glb_category = addslashes( $_POST[ "glb_category" ] );
  $glb_reg_no = addslashes( $_POST[ "glb_reg_no" ] );
  $glb_vmodel = addslashes( $_POST[ "glb_vmodel" ] );
  $glb_insurance_date = addslashes( $_POST[ "glb_insurance_date" ] );
  $glb_cf_date = addslashes( $_POST[ "glb_cf_date" ] );
  $glb_reg_date = addslashes( $_POST[ "glb_reg_date" ] );
  $glb_permit_date = addslashes( $_POST[ "glb_permit_date" ] );
  $glb_nat_permit_date = addslashes( $_POST[ "glb_nat_permit_date" ] );
  $glb_tax_date = addslashes( $_POST[ "glb_tax_date" ] );
  $glb_qut_date = addslashes( $_POST[ "glb_qut_date" ] );
  
   
   
   
  $glb_remarks = addslashes( $_POST[ "glb_remarks" ] ); 


  $glb_status = addslashes( $_POST[ "glb_status" ] );
  $glb_action = addslashes( $_POST[ "glb_action" ] );
  $rej_res_id = addslashes( $_POST[ "rej_res_id" ] );
  $updated_date = date( 'Y-m-d H:i:s' );
  $updated_by = $_SESSION[ 'adm_id' ];

  $sql_expe_updt = "UPDATE global_detail SET glb_adm_id='" . $glb_adm_id . "', glb_date='" . $glb_date . "', glb_name='" . $glb_name."', glb_series='" . $glb_series."', glb_fname='" . $glb_fname."', glb_address='" . $glb_address."', glb_chassis='" . $glb_chassis."', glb_engine='" . $glb_engine."', glb_contact='".$glb_contact."', glb_altcontact='".$glb_altcontact."', glb_category='".$glb_category."', glb_reg_no='".$glb_reg_no."', glb_vmodel='".$glb_vmodel."',glb_insurance_date='" . $glb_insurance_date . "', glb_cf_date='" . $glb_cf_date . "', glb_reg_date='" . $glb_reg_date . "', glb_permit_date='" . $glb_permit_date . "', glb_nat_permit_date='" . $glb_nat_permit_date . "', glb_tax_date='" . $glb_tax_date . "', glb_qut_date='" . $glb_qut_date . "',   glb_remarks='".$glb_remarks."', updated_by='" . $updated_by . "', glb_status='" . $glb_status . "', glb_action='" . $glb_action . "', rej_res_id='" . $rej_res_id . "', updated_date='" . $updated_date . "' WHERE glb_id=" . $glb_id;
  if ( $con->query( $sql_expe_updt ) === TRUE ) {

    $query_clone = "SELECT * FROM global_detail ld where ld.glb_id=".$glb_id." and ld.glb_action=3";
    $result_clone = $con->query( $query_clone );
    $total_records_clone = $result_clone->num_rows;
    $row_clone = $result_clone->fetch_object();

    

    if ( $total_records_clone >= 1 ) {
      $col_rencode = "SELECT * FROM renewal_detail cd where ren_code_no LIKE 'REN%' ORDER BY cd.ren_id DESC";
      $result_col_rencode = $con->query( $col_rencode );
      $ren_lat_id = $result_col_rencode->num_rows + 1;
      $ren_code_no = "REN" . $ren_lat_id;

      $branch_id = $_SESSION[ 'adm_branch' ];
      $ren_adm_id = $row_clone->glb_adm_id;
      $ren_date = $row_clone->glb_date;
      $ren_name = $row_clone->glb_name;
      $ren_series = $row_clone->glb_series;
      $ren_fname = $row_clone->glb_fname;
      $ren_contact = $row_clone->glb_contact;
      $ren_altcontact = $row_clone->glb_altcontact;
      $ren_address = $row_clone->glb_address;
      $ren_category = $row_clone->glb_category;
      $ren_chassis = $row_clone->glb_chassis;
      $ren_engine = $row_clone->glb_engine;
      $ren_reg_no = $row_clone->glb_reg_no;
      $ren_vmodel = $row_clone->glb_vmodel;
      $ren_insurance_date = $row_clone->glb_insurance_date;
      $ren_cf_date = $row_clone->glb_cf_date;
      $ren_reg_date = $row_clone->glb_reg_date;
      $ren_permit_date = $row_clone->glb_permit_date;
      $ren_nat_permit_date = $row_clone->glb_nat_permit_date;
      $ren_tax_date = $row_clone->glb_tax_date;
      $ren_qut_date = $row_clone->glb_qut_date;
      $ren_remarks = $row_clone->glb_remarks;
      $ren_status = 1;
      $ren_action = 1;
      $rej_res_id = 0;
      $added_date = date( 'Y-m-d H:i:s' );
      $updated_date = date( 'Y-m-d H:i:s' );
      $added_by = $_SESSION[ 'adm_id' ];
      $updated_by = $_SESSION[ 'adm_id' ];

      // Check  Duplicate Record
      $query_ren_dup = "SELECT * FROM renewal_detail where ren_reg_no='".$ren_reg_no."' and ren_status!='3' and ren_action!='3'";
      $result_ren_dup = $con->query( $query_ren_dup );
      $total_records_ren_dup = $result_ren_dup->num_rows;
      $row_rencln = $result_ren_dup->fetch_object();
      if ( $total_records_ren_dup >= 1 ) {
        $sql_ren_updt = "UPDATE renewal_detail SET ren_adm_id='" . $ren_adm_id . "', ren_date='" . $ren_date . "', ren_name='" . $ren_name."', ren_series='" . $ren_series."', ren_fname='" . $ren_fname."', ren_address='" . $ren_address."', ren_chassis='" . $ren_chassis."', ren_engine='" . $ren_engine."', ren_contact='".$ren_contact."', ren_category='".$ren_category."', ren_reg_no='".$ren_reg_no."', ren_vmodel='".$ren_vmodel."',ren_insurance_date='" . $ren_insurance_date . "', ren_cf_date='" . $ren_cf_date . "', ren_reg_date='" . $ren_reg_date . "', ren_permit_date='" . $ren_permit_date . "', ren_nat_permit_date='" . $ren_nat_permit_date . "', ren_tax_date='" . $ren_tax_date . "', ren_qut_date='" . $ren_qut_date . "',   ren_remarks='".$ren_remarks."', updated_by='" . $updated_by . "', updated_date='" . $updated_date . "' WHERE ren_id=" . $row_rencln->ren_id;
        $con->query($sql_ren_updt);

        $query_doccln = "SELECT * FROM document_detail ld where ld.glb_id=".$glb_id." and ld.document_status=1";
        $result_doccln = $con->query( $query_doccln );
        $total_records_doccln = $result_doccln->num_rows;
        // echo $total_records_doccln; exit;
        if ( $total_records_doccln >= 1 ) {
          while ( $row_doccln = $result_doccln->fetch_object() ) {
            $sql_document_updt = "UPDATE document_detail SET glb_id='0', ren_id='".$row_rencln->ren_id."', updated_by='".$updated_by."', updated_date='".$updated_date."' WHERE document_id=".$row_doccln->document_id;
            $updated_qu=$con->query($sql_document_updt);
          }
        }
      } else {
        $sql_ren_ins = "INSERT INTO renewal_detail (branch_id, ren_code_no,  ren_adm_id, ren_date, ren_name, ren_series, ren_fname, ren_address, ren_chassis, ren_engine, ren_contact, ren_reg_no, ren_vmodel, ren_category, ren_insurance_date, ren_cf_date, ren_reg_date, ren_permit_date, ren_nat_permit_date, ren_tax_date, ren_qut_date,  ren_remarks, added_by, updated_by, ren_status, ren_action, rej_res_id, added_date, updated_date) VALUES ('" . $branch_id . "','" . $ren_code_no . "','" . $ren_adm_id . "','" . $ren_date . "','" . $ren_name . "','" . $ren_series . "','" . $ren_fname . "','" . $ren_address . "','" . $ren_chassis . "','" . $ren_engine . "','" . $ren_contact . "','" . $ren_reg_no . "','" . $ren_vmodel . "','" . $ren_category . "','" . $ren_insurance_date . "','" . $ren_cf_date . "','" . $ren_reg_date . "','" . $ren_permit_date . "','" . $ren_nat_permit_date . "','" . $ren_tax_date . "','" . $ren_qut_date . "', '" . $ren_remarks . "','" . $added_by . "','" . $updated_by . "','" . $ren_status . "','" . $ren_action . "','" . $rej_res_id . "','" . $added_date . "','" . $updated_date . "')";
        $con->query($sql_ren_ins);

        $query_doccln = "SELECT * FROM document_detail ld where ld.glb_id=".$glb_id." and ld.document_status=1";
        $result_doccln = $con->query( $query_doccln );
        $total_records_doccln = $result_doccln->num_rows;
        // echo $total_records_doccln; exit;
        if ( $total_records_doccln >= 1 ) {
          while ( $row_doccln = $result_doccln->fetch_object() ) {
            $sql_document_updt = "UPDATE document_detail SET glb_id='0', ren_id='".$ren_lat_id."', updated_by='".$updated_by."', updated_date='".$updated_date."' WHERE document_id=".$row_doccln->document_id;
            $updated_qu=$con->query($sql_document_updt);
          }
        }
      }
      // echo $row_clone->glb_name; exit;
    } 
    header( 'Location: global_view.php?flag=2' ); exit;
  } else {
    header( 'Location: global_edit.php?glb_id='.$glb_id.'' );  exit;
  }
}

$query_state_detail = "SELECT * FROM global_detail ld where ld.glb_id=" . $glb_id." and glb_status!='3' and glb_action!='3'";
$result_query = $con->query( $query_state_detail );
$row_state = $result_query->fetch_object();
if($row_state->branch_id != $_SESSION['adm_branch']) {
  header( 'Location: insurance_dashboard.php' );
}
if ( $_SESSION[ 'adm_type' ] != 0 ) { 
if($row_state->glb_adm_id != $_SESSION['adm_id']) {
  header( 'Location: insurance_dashboard.php' );
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
<title>Global Edit   -<?php echo $meta_title; ?></title>
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
      <h2><i class="fa fa-pen"></i> Global Edit </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="insurance_dashboard.php">Dashboard</a></li>
          <li class="active">Global Edit </li>
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
                <h4 class="panel-title">Global Details</h4>
                <p>Please set global details here</p>
              </div>
              <div class="panel-body">
                 
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Global Code <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="text" disabled class="form-control" placeholder="" value="<?php echo $row_state->glb_code_no; ?>"  />
                  </div>
                </div>

                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Series <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="glb_series" class="form-control" value="<?php echo $row_state->glb_series ?>" placeholder="Ex: A" required />
              </div>
            </div>

                
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Date <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="date" name="glb_date" id="glb_date" value="<?php $datend   = new DateTime($row_state->glb_date); echo $datend->format('Y-m-d'); ?>" class="form-control" placeholder="Type dob..." required />
                  </div>
                </div>
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Register No. <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="glb_reg_no" class="form-control" value="<?php echo $row_state->glb_reg_no ?>" required placeholder="GJ01CV0267" />
              </div>
            </div>
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Name <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="glb_name" class="form-control" value="<?php echo $row_state->glb_name ?>" placeholder="Jakirhusen Parasara" required />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Mobile No.  <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="glb_contact" value="<?php echo $row_state->glb_contact ?>" class="form-control" pattern="\d*" minlength="10" maxlength="10"  required placeholder="9898569898" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Alt Mobile No. </label>
              <div class="col-sm-9">
                <input type="phone" name="glb_altcontact" value="<?php echo $row_state->glb_altcontact ?>" class="form-control" pattern="\d*" minlength="10" maxlength="10"  placeholder="9898569898" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Model <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="glb_vmodel" class="form-control" value="<?php echo $row_state->glb_vmodel ?>" required placeholder="Super Carry Std Cng"  />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Category <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <!-- <input type="text" name="glb_category" class="form-control" value="<?php echo $row_state->glb_category ?>" placeholder="HGV" /> -->
                <select required class="form-control" name="glb_category">
                  <option value="">Select Category</option>
                  <option <?php if ($row_state->glb_category == "LCV") { ?>selected<?php } ?> value="LCV">LCV</option>
                  <option <?php if ($row_state->glb_category == "HGV") { ?>selected<?php } ?> value="HGV">HGV</option>
                  <option <?php if ($row_state->glb_category == "LMV") { ?>selected<?php } ?> value="LMV">LMV</option>
                  <option <?php if ($row_state->glb_category == "3W PCV") { ?>selected<?php } ?> value="3W PCV">3W PCV</option>
                  <option <?php if ($row_state->glb_category == "3W GCV") { ?>selected<?php } ?> value="3W GCV">3W GCV</option>
                  <option <?php if ($row_state->glb_category == "2W") { ?>selected<?php } ?> value="2W">2W</option>
                  <option <?php if ($row_state->glb_category == "TAXI") { ?>selected<?php } ?> value="TAXI">TAXI</option>
                  <option <?php if ($row_state->glb_category == "BUS") { ?>selected<?php } ?> value="BUS">BUS</option>
                  <option <?php if ($row_state->glb_category == "STAFF BUS") { ?>selected<?php } ?> value="STAFF BUS">STAFF BUS</option>
                  <option <?php if ($row_state->glb_category == "SCHOOL BUS") { ?>selected<?php } ?> value="SCHOOL BUS">SCHOOL BUS</option>
                  <option <?php if ($row_state->glb_category == "OTHER") { ?>selected<?php } ?> value="OTHER">OTHER</option> 
                </select>
              </div>
            </div>

                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Father Name </label>
              <div class="col-sm-9">
                <input type="text" name="glb_fname" class="form-control" value="<?php echo $row_state->glb_fname ?>" placeholder="Alibhai Parasara" />
              </div>
            </div>
              
            
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Address </label>
              <div class="col-sm-9">
                <textarea name="glb_address" class="form-control" cols="30" rows="2" placeholder="ex: Type address..."><?php echo $row_state->glb_address ?></textarea>                 
              </div>
            </div>
           
            
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">GVW  </label>
              <div class="col-sm-9">
                <input type="text" name="glb_chassis" class="form-control" value="<?php echo $row_state->glb_chassis ?>" placeholder="11990" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Insurance Company <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <!-- <input type="text" name="glb_engine" class="form-control" value="<?php // echo $row_state->glb_engine ?>" placeholder="Tata AIG General Insurance" /> -->
                <select required class="form-control" name="glb_engine">
                  <option value="">Select Insurance Company</option>
                  <option <?php if ($row_state->glb_engine == "HDFC") { ?>selected<?php } ?> value="HDFC">HDFC</option>
                  <option <?php if ($row_state->glb_engine == "ICICI") { ?>selected<?php } ?> value="ICICI">ICICI</option>
                  <option <?php if ($row_state->glb_engine == "RELIANCE") { ?>selected<?php } ?> value="RELIANCE">RELIANCE</option>
                  <option <?php if ($row_state->glb_engine == "TATA AIG") { ?>selected<?php } ?> value="TATA AIG">TATA AIG</option>
                  <option <?php if ($row_state->glb_engine == "GO DIGIT") { ?>selected<?php } ?> value="GO DIGIT">GO DIGIT</option>
                  <option <?php if ($row_state->glb_engine == "CHOLA MS") { ?>selected<?php } ?> value="CHOLA MS">CHOLA MS</option>
                  <option <?php if ($row_state->glb_engine == "BAJAJ") { ?>selected<?php } ?> value="BAJAJ">BAJAJ</option>
                  <option <?php if ($row_state->glb_engine == "MAGMA") { ?>selected<?php } ?> value="MAGMA">MAGMA</option>
                  <option <?php if ($row_state->glb_engine == "UNITED") { ?>selected<?php } ?> value="UNITED">UNITED</option>
                  <option <?php if ($row_state->glb_engine == "NEW INDIA") { ?>selected<?php } ?> value="NEW INDIA">NEW INDIA</option>
                  <option <?php if ($row_state->glb_engine == "ORIENTAL") { ?>selected<?php } ?> value="ORIENTAL">ORIENTAL</option>
                  <option <?php if ($row_state->glb_engine == "SBI") { ?>selected<?php } ?> value="SBI">SBI</option>
                  <option <?php if ($row_state->glb_engine == "FUTURE") { ?>selected<?php } ?> value="FUTURE">FUTURE</option>
                  <option <?php if ($row_state->glb_engine == "UNIVERSAL SOMPO") { ?>selected<?php } ?> value="UNIVERSAL SOMPO">UNIVERSAL SOMPO</option>
                  <option <?php if ($row_state->glb_engine == "SHRIRAM") { ?>selected<?php } ?> value="SHRIRAM">SHRIRAM</option>
                  <option <?php if ($row_state->glb_engine == "NATIONAL") { ?>selected<?php } ?> value="NATIONAL">NATIONAL</option>
                  <option <?php if ($row_state->glb_engine == "IFFCO") { ?>selected<?php } ?> value="IFFCO">IFFCO</option>
                  <option <?php if ($row_state->glb_engine == "LIBERTY") { ?>selected<?php } ?> value="LIBERTY">LIBERTY</option>
                  <option <?php if ($row_state->glb_engine == "ROYAL SUNDARAM") { ?>selected<?php } ?> value="ROYAL SUNDARAM">ROYAL SUNDARAM</option>
                  <option <?php if ($row_state->glb_engine == "ZUNO") { ?>selected<?php } ?> value="ZUNO">ZUNO</option>
                  <option <?php if ($row_state->glb_engine == "KOTAK") { ?>selected<?php } ?> value="KOTAK">KOTAK</option>
              </select>
              </div>
            </div>
            
            
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Insurance Date</label>
                  <div class="col-sm-9">
                    <input type="date" name="glb_insurance_date" id="glb_insurance_date" value="<?php if($row_state->glb_insurance_date!="") { $datend   = new DateTime($row_state->glb_insurance_date); echo $datend->format('Y-m-d'); } ?>" class="form-control"  />
                  </div>
                </div>
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">CF Date</label>
                  <div class="col-sm-9">
                    <input type="date" name="glb_cf_date" id="glb_cf_date" value="<?php if($row_state->glb_cf_date!="") {  $datend   = new DateTime($row_state->glb_cf_date); echo $datend->format('Y-m-d'); } ?>" class="form-control"  />
                  </div>
                </div>
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Registration Date</label>
                  <div class="col-sm-9">
                    <input type="date" name="glb_reg_date" id="glb_reg_date" value="<?php if($row_state->glb_reg_date!="") {  $datend   = new DateTime($row_state->glb_reg_date); echo $datend->format('Y-m-d'); } ?>" class="form-control"  />
                  </div>
                </div>
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Permit Date</label>
                  <div class="col-sm-9">
                    <input type="date" name="glb_permit_date" id="glb_permit_date" value="<?php if($row_state->glb_permit_date!="") {  $datend   = new DateTime($row_state->glb_permit_date); echo $datend->format('Y-m-d'); } ?>" class="form-control"  />
                  </div>
                </div>
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">National Permit Date</label>
                  <div class="col-sm-9">
                    <input type="date" name="glb_nat_permit_date" id="glb_nat_permit_date" value="<?php if($row_state->glb_nat_permit_date!="") {  $datend   = new DateTime($row_state->glb_nat_permit_date); echo $datend->format('Y-m-d'); } ?>" class="form-control"  />
                  </div>
                </div>
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">TAX Date</label>
                  <div class="col-sm-9">
                    <input type="date" name="glb_tax_date" id="glb_tax_date" value="<?php if($row_state->glb_tax_date!="") {  $datend   = new DateTime($row_state->glb_tax_date); echo $datend->format('Y-m-d'); } ?>" class="form-control"  />
                  </div>
                </div>
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Quote Date</label>
                  <div class="col-sm-9">
                    <input type="date" name="glb_qut_date" id="glb_qut_date" value="<?php if($row_state->glb_qut_date!="") {  $datend   = new DateTime($row_state->glb_qut_date); echo $datend->format('Y-m-d'); } ?>" class="form-control"  />
                  </div>
                </div>
                
             
                 
                
              
           <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Remarks </label>
              <div class="col-sm-9">
                <textarea name="glb_remarks" class="form-control" cols="30" rows="2" placeholder="ex: Type remarks..."><?php echo $row_state->glb_remarks ?></textarea>                 
              </div>
            </div>

           <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Staff<span class="asterisk">*</span> </label>
                  <div class="col-sm-9">
                    <select required class="form-control" name="glb_adm_id" >
                      <option value="" >Select Staff</option>
                       <?php
                      $query_admin = "SELECT * FROM admin_login WHERE adm_status=1 and adm_id!=1 and branch_id=".$_SESSION[ 'adm_branch' ]."";
                      $result_admin = $con->query( $query_admin );
                      while ( $row_admin = $result_admin->fetch_object() ) {
                        ?>
                      <option value="<?php echo $row_admin->adm_id?>" <?php if ($row_admin->adm_id==$row_state->glb_adm_id) { ?>selected<?php } ?> > <?php echo $row_admin->adm_username?> </option>
                      <?php } ?>
                    </select>
                  </div>
                </div>

                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Action <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="glb_action">
                  <option value="">Select Action</option>
                  <option value="1" <?php if ($row_state->glb_action == 1) { ?>selected<?php } ?>>Pending</option>
                  <option value="2" <?php if ($row_state->glb_action == 2) { ?>selected<?php } ?>>Rejected</option>
                  <option value="3" <?php if ($row_state->glb_action == 3) { ?>selected<?php } ?>>Completed</option>
                </select>
              </div>
            </div>
            <?php if ($row_state->glb_action == 2) {  ?>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12" id="rej_show_2">
              <label class="col-sm-3 control-label">Reason <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select class="form-control" name="rej_res_id">
                  <option value="">Select Reason</option>
                  <?php
                  $query_rejres = "SELECT * FROM rej_res_detail WHERE rej_res_status=1";
                  $result_rejres = $con->query( $query_rejres );
                  while ( $row_rejres = $result_rejres->fetch_object() ) {
                  ?>
                  <option <?php if ($row_rejres->rej_res_id==$row_state->rej_res_id) { ?>selected<?php } ?> value="<?php echo $row_rejres->rej_res_id ?>"><?php echo $row_rejres->rej_res_name ?></option>
                  <?php } ?>
                </select>
              </div>
            </div>
            <?php } else { ?>
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
              <?php } ?>

            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Status <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <select required class="form-control" name="glb_status">
                      <?php
                      $query_status = "SELECT * FROM status_detail WHERE status_id!=3";
                      $result_status = $con->query( $query_status );
                      while ( $row_status = $result_status->fetch_object() ) {
                        ?>
                      <option <?php if ($row_status->status_id == $row_state->glb_status) { ?>selected<?php } ?> value="<?php echo $row_status->status_id ?>"> <?php echo $row_status->status_name ?> </option>
                      <?php } ?>
                    </select>
                  </div>
                </div>
              </div>
              <!-- panel-body -->
              <div class="panel-footer">
                <div class="row">
                  <div class="col-sm-12 col-lg-12 col-md-12 col-xs-12 ml_15">
                    <input type="submit" name="submit" value="Edit " class="btn btn-primary" onClick="return validation();">
                    <input type="reset" style="background:#FFFFFF" class="btn btn-default" value="Cancel" onClick="location.href='global_view.php'">
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
      // Hide the "rej_show" div initially
      $("#rej_show").hide();

      // Listen for changes in the "glb_action" select element
      $("select[name='glb_action']").change(function() {
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