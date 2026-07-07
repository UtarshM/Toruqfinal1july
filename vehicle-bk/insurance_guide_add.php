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
if ( !in_array( "11", $md_right ) ) {
  header( 'Location: insurance_dashboard.php' );
}
// Check Module Rights

 
$col_cdo = "SELECT * FROM insurance_guide_detail cd where insr_code_no LIKE 'POLICYCHECKFORM%' ORDER BY cd.insr_id DESC";
$result_col_cdo = $con->query( $col_cdo );
$total_records = $result_col_cdo->num_rows + 1;
$insr_code_no = "POLICYCHECKFORM" . $total_records;
// echo $insr_code_no; exit;
if ( isset( $_POST[ "submit" ] ) ) {

  // /////// IMAGE UPLOAD
  // if(!empty($_FILES['insr_pdf']['name']))	
  // {	
  //   // EXT VALIDATION
  //   $file_ext=strtolower(end(explode('.',$_FILES['insr_pdf']['name'])));
  //   $valid_exts = array('pdf','PDF');
  //   if (in_array($file_ext, $valid_exts)) { 
  //   // echo "Valid File";
  //     ///// FILE EXT 
  //     $file_ext_img=strtolower(end(explode('.',$_FILES['insr_pdf']['name'])));
  //     $valid_exts_img = array('pdf','PDF');
  //       if (in_array($file_ext_img, $valid_exts_img)) { 
  //         // echo "IMAGE HERE";
  //         ////// IMAGE UPLOAD
  //         if(!empty($_FILES['insr_pdf']['name']))	
  //         {				
  //           // $ran1=rand(1,9999);
  //           $ran1 =date("d-m-y-h-i-s");
  //           $file_name = $_FILES['insr_pdf']['name'];
  //           $file_tmp =$_FILES['insr_pdf']['tmp_name'];
            
  //           $benner = $ran1.$file_name;
  //           move_uploaded_file($file_tmp,"img/ins_pdf_file/".$benner);
  //         }
  //       } 
  //   } else {
  //   // echo " IN Valid File";
  //   header("Location: insurance_guide_add.php?&msg=erimgext");  exit;
  //   }
  //     ///// FILE EXT 
  //  }
  // ////// IMAGE UPLOAD

  /////// IMAGE UPLOAD
  if (!empty($_FILES['insr_pdf']['name'])) {	

    // EXT VALIDATION
    $file_ext = strtolower(pathinfo($_FILES['insr_pdf']['name'], PATHINFO_EXTENSION));
    $valid_exts = array('jpg', 'jpeg', 'png');

    if (in_array($file_ext, $valid_exts)) { 
      // IMAGE UPLOAD
      $ran1 = date("d-m-y-h-i-s");
      $file_name = $_FILES['insr_pdf']['name'];
      $file_tmp = $_FILES['insr_pdf']['tmp_name'];

      $benner = $ran1 . '-' . $file_name;
      move_uploaded_file($file_tmp, "img/ins_pdf_file/" . $benner);

    } else {
      // Invalid file extension
      header("Location: insurance_guide_add.php?&msg=erimgext");
      exit;
    }
  }
  /////// IMAGE UPLOAD

  
  $branch_id = $_SESSION[ 'adm_branch' ];
  $insr_date = addslashes( $_POST[ "insr_date" ] );
  $insr_regno = addslashes( $_POST[ "insr_regno" ] );
  $insr_pdf = $benner;
  $insr_name = addslashes( $_POST[ "insr_name" ] );
 
  $insr_status = addslashes( $_POST[ "insr_status" ] );

  $added_date = date( 'Y-m-d H:i:s' );
  $updated_date = date( 'Y-m-d H:i:s' );
  $added_by = $_SESSION[ 'adm_id' ];
  $updated_by = $_SESSION[ 'adm_id' ];

  // Check  Duplicate Record
  // $query_insr_dup = "SELECT * FROM insurance_guide_detail where insr_regno='".$insr_regno."' and insr_status!='3' ";
  // $result_insr_dup = $con->query( $query_insr_dup );
  // $total_records_insr_dup = $result_insr_dup->num_rows;
  // if ( $total_records_insr_dup >= 1 ) {
  //   $flag = 11;
  //   $insr_date = $insr_date;
   //   $insr_regno = $insr_regno;
  //   $insr_name = $insr_name;

  // } else {
   $sql_expe_ins = "INSERT INTO insurance_guide_detail (branch_id, insr_code_no,  insr_date, insr_regno, insr_pdf, insr_name, added_by, updated_by, insr_status, added_date, updated_date) VALUES ('" . $branch_id . "','" . $insr_code_no . "','" . $insr_date . "','" . $insr_regno . "','" . $insr_pdf . "','" . $insr_name . "','" . $added_by . "','" . $updated_by . "','" . $insr_status . "','" . $added_date . "','" . $updated_date . "')";

    // echo $sql_expe_ins; exit;
    if ( $con->query( $sql_expe_ins ) === TRUE ) {
      header( 'Location: insurance_guide_view.php?flag=1' );
    } else {
      header( 'Location: insurance_guide_add.php' );
    }
  // } // Check  Duplicate Record
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Add Policy Check Form  -<?php echo $meta_title; ?></title>
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
  <h2><i class="fa fa-plus"></i> Add Policy Check Form </h2>
  <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
    <ol class="breadcrumb">
      <li><a style="color:#1C1B17;" href="insurance_dashboard.php">Dashboard</a></li>
      <li class="active">Add Policy Check Form </li>
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
            <h4 class="panel-title">Policy Check Form Details</h4>
            <?php if(isset($flag)==11){?>
            <p style="color:red;">This registration no. is already exists</p>
            <?php } ?>
            <?php
                if ($_GET['msg'] == "erimgext") {
                  echo "<span style='color:red; font-size:14px;'>File type wrong, Please select only JPG</span>";
                }
                ?>
            <p>Please set insurance details here.</p>
          </div>
          <div class="panel-body">
            
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Policy Check Form Code <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="text" disabled class="form-control" value="<?php echo $insr_code_no; ?>"  />
              </div>
            </div>
             
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Date <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="date" name="insr_date" class="form-control" value="<?php if($insr_date!="") { $datend   = new DateTime($insr_date); echo $datend->format('Y-m-d'); } else { $datend   = new DateTime(); echo $datend->format('Y-m-d'); } ?>" required />
              </div>
            </div>
              
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Reg No. <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="insr_regno" class="form-control" required value="<?php echo $insr_regno; ?>" placeholder="GJ01AJ5896" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Policy Check Form JPG (Only JPG) <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
              <input type="file" name="insr_pdf" id=""  class="form-control" required />
              </div>
            </div>

          

            
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Name <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="insr_name" class="form-control" required value="<?php echo $insr_name; ?>" placeholder="Jakirhusen Parasara" />
              </div>
            </div>
             
            

            

            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Status <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="insr_status">
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