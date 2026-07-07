<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );

require( 'library/php-excel-reader/excel_reader2.php' );
require( 'library/SpreadsheetReader.php' );

if ( isset( $_POST[ 'submit_renewal_excel' ] ) ) {
  $mimes = [ 'application/vnd.ms-excel', 'text/xls', 'text/xlsx', 'application/vnd.oasis.opendocument.spreadsheet' ];
  if ( in_array( $_FILES[ "file" ][ "type" ], $mimes ) ) {
    $curt_time = date('d-m-Y-h-i-s-', time());
    $uploadFilePath = 'uploads_renewal_excel/' .$curt_time. basename( $_FILES[ 'file' ][ 'name' ] );
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
          $ren_series = isset( $Row[ 0 ] ) ? $Row[ 0 ] : '';

          $ren_reg_no = isset( $Row[ 1 ] ) ? $Row[ 1 ] : '';
          $ren_name = isset( $Row[ 2 ] ) ? $Row[ 2 ] : '';
          $ren_contact = isset( $Row[ 3 ] ) ? $Row[ 3 ] : '';
          $ren_vmodel = isset( $Row[ 4 ] ) ? $Row[ 4 ] : '';
          $ren_category = isset( $Row[ 5 ] ) ? $Row[ 5 ] : '';
          $ren_fname = isset( $Row[ 6 ] ) ? $Row[ 6 ] : '';
          $ren_address = isset( $Row[ 7 ] ) ? $Row[ 7 ] : '';
          $ren_chassis = isset( $Row[ 8 ] ) ? $Row[ 8 ] : '';
          $ren_engine = isset( $Row[ 9 ] ) ? $Row[ 9 ] : '';
          $ren_insurance_date = isset( $Row[ 10 ] ) ? $Row[ 10 ] : '';

          if(empty($ren_insurance_date)){ $ren_insurance_date = NULL; } else{ $ren_insurance_date = date('Y-m-d', strtotime($ren_insurance_date)); }
          $ren_cf_date = isset( $Row[ 11 ] ) ? $Row[ 11 ] : '';
          
          if(empty($ren_cf_date)){ $ren_cf_date = NULL; } else{ $ren_cf_date = date('Y-m-d', strtotime($ren_cf_date)); }
          $ren_reg_date = isset( $Row[ 12 ] ) ? $Row[ 12 ] : '';
          
          if(empty($ren_reg_date)){ $ren_reg_date = NULL; } else{ $ren_reg_date = date('Y-m-d', strtotime($ren_reg_date)); }
          $ren_permit_date = isset( $Row[ 13 ] ) ? $Row[ 13 ] : '';
          
          if(empty($ren_permit_date)){ $ren_permit_date = NULL; } else{ $ren_permit_date = date('Y-m-d', strtotime($ren_permit_date)); }
          $ren_nat_permit_date = isset( $Row[ 14 ] ) ? $Row[ 14 ] : '';
          
          if(empty($ren_nat_permit_date)){ $ren_nat_permit_date = "NULL"; } else{ $ren_nat_permit_date = date('Y-m-d', strtotime($ren_nat_permit_date)); }
          $ren_tax_date = isset( $Row[ 15 ] ) ? $Row[ 15 ] : '';
          
          if(empty($ren_tax_date)){ $ren_tax_date = NULL; } else{ $ren_tax_date = date('Y-m-d', strtotime($ren_tax_date)); }
          $ren_qut_date = isset( $Row[ 16 ] ) ? $Row[ 16 ] : '';
          
          if(empty($ren_qut_date)){ $ren_qut_date = NULL; } else{ $ren_qut_date = date('Y-m-d', strtotime($ren_qut_date)); }
          $ren_remarks = isset( $Row[ 17 ] ) ? $Row[ 17 ] : '';

          $ren_netprem = isset( $Row[ 18 ] ) ? $Row[ 18 ] : '';
          $ren_totprem = isset( $Row[ 19 ] ) ? $Row[ 19 ] : '';
          // echo $ren_nat_permit_date; exit;
          $s_max = "SELECT MAX( ren_id ) AS max FROM `renewal_detail`";
          $result_max = $con->query($s_max);
          $row_max = $result_max->fetch_object();
          $max_ren_id = $row_max->max + 1;
          $ren_code_no = "GLB".$max_ren_id;
          // $query_ren_dup = "SELECT * FROM renewal_detail where ren_reg_no='".$ren_reg_no."' and ren_status!='3' and ren_action!='3'";
          // $result_ren_dup = $con->query( $query_ren_dup );
          // $total_records_ren_dup = $result_ren_dup->num_rows;
          // // echo $total_records_ren_dup; exit;
          // if ( $total_records_ren_dup >= 1 ) {
          //   // echo "ALREADY EXIST";
            
          //   $ren_date = date( 'Y-m-d H:i:s' );
          //   $updated_by = $_SESSION[ 'adm_id' ];
          //   $updated_date = date( 'Y-m-d H:i:s' );
          //   if($ren_series!="" && $ren_name!="" && $ren_vmodel!="" && $ren_reg_no!="") {
          //   // UPDATE RECORD 
          //   $sql_expe_updt = "UPDATE renewal_detail SET ren_date='" . $ren_date . "', ren_series='" . $ren_series."', ren_name='" . $ren_name."', ren_fname='" . $ren_fname."', ren_address='" . $ren_address."', ren_chassis='" . $ren_chassis."', ren_engine='" . $ren_engine."', ren_contact='".$ren_contact."', ren_category='".$ren_category."', ren_reg_no='".$ren_reg_no."', ren_vmodel='".$ren_vmodel."', ren_insurance_date='" . $ren_insurance_date . "', ren_cf_date='" . $ren_cf_date . "', ren_reg_date='" . $ren_reg_date . "', ren_permit_date='" . $ren_permit_date . "', ren_nat_permit_date='" . $ren_nat_permit_date . "', ren_tax_date='" . $ren_tax_date . "', ren_qut_date='" . $ren_qut_date . "',   ren_remarks='".$ren_remarks."', updated_by='" . $updated_by . "', updated_date='" . $updated_date . "' WHERE ren_reg_no='".$ren_reg_no."'";
          //   $con->query( $sql_expe_updt );
          //   }

          //   // UPDATE RECORD 
          // } else {
            // echo "New";
            // INSERT RECORD
            $ren_adm_id=0;
            $branch_id = $_SESSION[ 'adm_branch' ];
            $ren_status = 1;
            $ren_action = 1;
            $ren_date = date( 'Y-m-d H:i:s' );
            $added_date = date( 'Y-m-d H:i:s' );
            $updated_date = date( 'Y-m-d H:i:s' );
            $added_by = $_SESSION[ 'adm_id' ];
            $updated_by = $_SESSION[ 'adm_id' ];
            if($ren_series!="" &&  $ren_name!="" && $ren_vmodel!="" && $ren_netprem!="" && $ren_totprem!="" && $ren_reg_no!="") {
              // echo $ren_series; exit;
            $sql_expe_ins = "INSERT INTO renewal_detail (ren_adm_id, branch_id, ren_code_no,  ren_date, ren_series, ren_name, ren_fname, ren_address, ren_chassis, ren_engine, ren_contact, ren_reg_no, ren_vmodel, ren_netprem, ren_totprem, ren_category, ren_insurance_date, ren_cf_date, ren_reg_date, ren_permit_date, ren_nat_permit_date, ren_tax_date, ren_qut_date,  ren_remarks, added_by, updated_by, ren_status, ren_action, added_date, updated_date) VALUES ('" . $ren_adm_id . "','" . $branch_id . "','" . $ren_code_no . "','" . $ren_date . "','" . $ren_series . "','" . $ren_name . "','" . $ren_fname . "','" . $ren_address . "','" . $ren_chassis . "','" . $ren_engine . "','" . $ren_contact . "','" . $ren_reg_no . "','" . $ren_vmodel . "','" . $ren_netprem . "','" . $ren_totprem . "','" . $ren_category . "','" . $ren_insurance_date . "','" . $ren_cf_date . "','" . $ren_reg_date . "','" . $ren_permit_date . "','" . $ren_nat_permit_date . "','" . $ren_tax_date . "','" . $ren_qut_date . "', '" . $ren_remarks . "','" . $added_by . "','" . $updated_by . "','" . $ren_status . "','" . $ren_action . "','" . $added_date . "','" . $updated_date . "')";
            $con->query( $sql_expe_ins );
            }
            // INSERT RECORD
          // }
        } else {
          $isheader = 1;
        }
        
      }
      // exit;
    }
    header('Location: renewal_view.php?flag=1');
  } else {
    header('Location: renewal_view.php?flag=5');
  }
}
?>