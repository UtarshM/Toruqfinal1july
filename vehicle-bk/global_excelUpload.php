<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );

require( 'library/php-excel-reader/excel_reader2.php' );
require( 'library/SpreadsheetReader.php' );

if ( isset( $_POST[ 'submit_global_excel' ] ) ) {
  $mimes = [ 'application/vnd.ms-excel', 'text/xls', 'text/xlsx', 'application/vnd.oasis.opendocument.spreadsheet' ];
  if ( in_array( $_FILES[ "file" ][ "type" ], $mimes ) ) {
    $curt_time = date('d-m-Y-h-i-s-', time());
    $uploadFilePath = 'uploads_global_excel/' .$curt_time. basename( $_FILES[ 'file' ][ 'name' ] );
    move_uploaded_file( $_FILES[ 'file' ][ 'tmp_name' ], $uploadFilePath );
    $Reader = new SpreadsheetReader( $uploadFilePath );
    $totalSheet = count( $Reader->sheets() );
    $isheader = 0;
    /* For Loop for all sheets */
    for ( $i = 0; $i < $totalSheet; $i++ ) {
      $Reader->ChangeSheet( $i );
      foreach ( $Reader as $Row )
      {
         if ( $isheader > 0 ) {
          $glb_series = isset( $Row[ 0 ] ) ? $Row[ 0 ] : '';
          $glb_reg_no = isset( $Row[ 1 ] ) ? $Row[ 1 ] : '';
          $glb_name = isset( $Row[ 2 ] ) ? $Row[ 2 ] : '';
          $glb_contact = isset( $Row[ 3 ] ) ? $Row[ 3 ] : '';
          $glb_vmodel = isset( $Row[ 4 ] ) ? $Row[ 4 ] : '';
          $glb_category = isset( $Row[ 5 ] ) ? $Row[ 5 ] : '';
          $glb_fname = isset( $Row[ 6 ] ) ? $Row[ 6 ] : '';
          $glb_address = isset( $Row[ 7 ] ) ? $Row[ 7 ] : '';
          $glb_chassis = isset( $Row[ 8 ] ) ? $Row[ 8 ] : '';
          $glb_engine = isset( $Row[ 9 ] ) ? $Row[ 9 ] : '';
          $glb_insurance_date = isset( $Row[ 10 ] ) ? $Row[ 10 ] : '';

          if(empty($glb_insurance_date)){ $glb_insurance_date = NULL; } else{ $glb_insurance_date = date('Y-m-d', strtotime($glb_insurance_date)); }
          $glb_cf_date = isset( $Row[ 11 ] ) ? $Row[ 11 ] : '';
          
          if(empty($glb_cf_date)){ $glb_cf_date = NULL; } else{ $glb_cf_date = date('Y-m-d', strtotime($glb_cf_date)); }
          $glb_reg_date = isset( $Row[ 12 ] ) ? $Row[ 12 ] : '';
          
          if(empty($glb_reg_date)){ $glb_reg_date = NULL; } else{ $glb_reg_date = date('Y-m-d', strtotime($glb_reg_date)); }
          $glb_permit_date = isset( $Row[ 13 ] ) ? $Row[ 13 ] : '';
          
          if(empty($glb_permit_date)){ $glb_permit_date = NULL; } else{ $glb_permit_date = date('Y-m-d', strtotime($glb_permit_date)); }
          $glb_nat_permit_date = isset( $Row[ 14 ] ) ? $Row[ 14 ] : '';
          
          if(empty($glb_nat_permit_date)){ $glb_nat_permit_date = "NULL"; } else{ $glb_nat_permit_date = date('Y-m-d', strtotime($glb_nat_permit_date)); }
          $glb_tax_date = isset( $Row[ 15 ] ) ? $Row[ 15 ] : '';
          
          if(empty($glb_tax_date)){ $glb_tax_date = NULL; } else{ $glb_tax_date = date('Y-m-d', strtotime($glb_tax_date)); }
          $glb_qut_date = isset( $Row[ 16 ] ) ? $Row[ 16 ] : '';
          
          if(empty($glb_qut_date)){ $glb_qut_date = NULL; } else{ $glb_qut_date = date('Y-m-d', strtotime($glb_qut_date)); }
          $glb_remarks = isset( $Row[ 17 ] ) ? $Row[ 17 ] : '';
          // echo $glb_nat_permit_date; exit;
          $s_max = "SELECT MAX( glb_id ) AS max FROM `global_detail`";
          $result_max = $con->query($s_max);
          $row_max = $result_max->fetch_object();
          $max_glb_id = $row_max->max + 1;
          $glb_code_no = "GLB".$max_glb_id;
          $query_glb_dup = "SELECT * FROM global_detail where glb_reg_no='".$glb_reg_no."' and glb_status!='3' and glb_action!='3'";
          $result_glb_dup = $con->query( $query_glb_dup );
          $total_records_glb_dup = $result_glb_dup->num_rows;
          // echo $total_records_glb_dup; exit;
          if ( $total_records_glb_dup >= 1 ) {
            // echo "ALREADY EXIST";
            
            $glb_date = date( 'Y-m-d H:i:s' );
            $updated_by = $_SESSION[ 'adm_id' ];
            $updated_date = date( 'Y-m-d H:i:s' );
            if($glb_series!="" && $glb_name!="" && $glb_vmodel!="" && $glb_reg_no!="") {
            // UPDATE RECORD 
            $sql_expe_updt = "UPDATE global_detail SET glb_date='" . $glb_date . "', glb_series='" . $glb_series."', glb_name='" . $glb_name."', glb_fname='" . $glb_fname."', glb_address='" . $glb_address."', glb_chassis='" . $glb_chassis."', glb_engine='" . $glb_engine."', glb_contact='".$glb_contact."', glb_category='".$glb_category."', glb_reg_no='".$glb_reg_no."', glb_vmodel='".$glb_vmodel."', glb_insurance_date='" . $glb_insurance_date . "', glb_cf_date='" . $glb_cf_date . "', glb_reg_date='" . $glb_reg_date . "', glb_permit_date='" . $glb_permit_date . "', glb_nat_permit_date='" . $glb_nat_permit_date . "', glb_tax_date='" . $glb_tax_date . "', glb_qut_date='" . $glb_qut_date . "',   glb_remarks='".$glb_remarks."', updated_by='" . $updated_by . "', updated_date='" . $updated_date . "' WHERE glb_reg_no='".$glb_reg_no."'";
            $con->query( $sql_expe_updt );
            }

            // UPDATE RECORD 
          } else {
            // echo "New";
            // INSERT RECORD
            $glb_adm_id=0;
            $branch_id = $_SESSION[ 'adm_branch' ];
            $glb_status = 1;
            $glb_action = 1;
            $glb_date = date( 'Y-m-d H:i:s' );
            $added_date = date( 'Y-m-d H:i:s' );
            $updated_date = date( 'Y-m-d H:i:s' );
            $added_by = $_SESSION[ 'adm_id' ];
            $updated_by = $_SESSION[ 'adm_id' ];
            if($glb_series!="" && $glb_name!="" && $glb_vmodel!="" && $glb_reg_no!="") {
            $sql_expe_ins = "INSERT INTO global_detail (glb_adm_id, branch_id, glb_code_no,  glb_date, glb_series, glb_name, glb_fname, glb_address, glb_chassis, glb_engine, glb_contact, glb_reg_no, glb_vmodel, glb_category, glb_insurance_date, glb_cf_date, glb_reg_date, glb_permit_date, glb_nat_permit_date, glb_tax_date, glb_qut_date,  glb_remarks, added_by, updated_by, glb_status, glb_action, added_date, updated_date) VALUES ('" . $glb_adm_id . "','" . $branch_id . "','" . $glb_code_no . "','" . $glb_date . "','" . $glb_series . "','" . $glb_name . "','" . $glb_fname . "','" . $glb_address . "','" . $glb_chassis . "','" . $glb_engine . "','" . $glb_contact . "','" . $glb_reg_no . "','" . $glb_vmodel . "','" . $glb_category . "','" . $glb_insurance_date . "','" . $glb_cf_date . "','" . $glb_reg_date . "','" . $glb_permit_date . "','" . $glb_nat_permit_date . "','" . $glb_tax_date . "','" . $glb_qut_date . "', '" . $glb_remarks . "','" . $added_by . "','" . $updated_by . "','" . $glb_status . "','" . $glb_action . "','" . $added_date . "','" . $updated_date . "')";
            $con->query( $sql_expe_ins );
            }
            // INSERT RECORD
          }
        } else {
          $isheader = 1;
        }
        
      }
      // exit;
    }
    header('Location: global_view.php?flag=1');
  } else {
    header('Location: global_view.php?flag=4');
  }
}
?>